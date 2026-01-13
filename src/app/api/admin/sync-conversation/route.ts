import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  extractPatientData,
  extractRequestData,
  formatTranscript,
  determineStatus,
} from '@/lib/elevenlabs/webhook';
import type { ElevenLabsWebhookPayload } from '@/types';

/**
 * POST /api/admin/sync-conversation
 *
 * Manually fetches a conversation from ElevenLabs API and syncs it to Supabase.
 * Use this when webhooks fail (ElevenLabs doesn't retry due to HIPAA).
 */
export async function POST(request: NextRequest) {
  try {
    const { conversation_id } = await request.json();

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`[Sync] Fetching conversation: ${conversation_id}`);

    // Fetch conversation from ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}`,
      {
        headers: {
          'Xi-Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Sync] ElevenLabs API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const conversationData = await response.json();
    console.log(`[Sync] Retrieved conversation data`);

    // Transform to match webhook payload format
    // The API response format should be similar to webhook format
    const data = {
      conversation_id: conversationData.conversation_id || conversation_id,
      agent_id: conversationData.agent_id,
      status: conversationData.status || 'done',
      transcript: conversationData.transcript || [],
      metadata: conversationData.metadata || {
        start_time_unix_secs: Math.floor(Date.now() / 1000),
        call_duration_secs: conversationData.call_duration_secs || 0,
      },
      analysis: conversationData.analysis || {},
    };

    // Create Supabase client
    const supabase = createServerClient();

    // Log sync attempt
    await supabase.from('call_logs').insert({
      conversation_id: data.conversation_id,
      event_type: 'manual_sync',
      payload: { source: 'api_fetch' },
    });

    // Extract structured data (pass transcript for emergency detection)
    const patientData = extractPatientData(data.analysis, data.transcript);
    const { type: requestType, data: requestData } = extractRequestData(data.analysis);
    const transcript = formatTranscript(data.transcript);
    const status = determineStatus(data.analysis, data.status as 'done' | 'failed');

    // Prepare submission record
    const submission = {
      conversation_id: data.conversation_id,
      agent_id: data.agent_id,
      call_timestamp: data.metadata.start_time_unix_secs
        ? new Date(data.metadata.start_time_unix_secs * 1000).toISOString()
        : new Date().toISOString(),
      call_duration_secs: data.metadata.call_duration_secs,
      caller_phone: patientData.phone_number || null,
      status,
      patient_data: patientData,
      request_type: requestType,
      request_data: requestData,
      transcript,
      analysis: data.analysis,
    };

    // Insert or update submission
    const { error: upsertError } = await supabase
      .from('submissions')
      .upsert(submission, {
        onConflict: 'conversation_id',
      });

    if (upsertError) {
      console.error('[Sync] Database error:', upsertError);
      return NextResponse.json(
        { error: 'Database error', details: upsertError.message },
        { status: 500 }
      );
    }

    // Log completion
    await supabase.from('call_logs').insert({
      conversation_id: data.conversation_id,
      event_type: 'sync_completed',
      payload: { status, patient_name: `${patientData.first_name} ${patientData.last_name}` },
    });

    console.log(`[Sync] Successfully synced: ${data.conversation_id}`);

    return NextResponse.json({
      success: true,
      conversation_id: data.conversation_id,
      status,
      patient_data: patientData,
    });

  } catch (error) {
    console.error('[Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync-conversation?agent_id=xxx
 *
 * Lists recent conversations from ElevenLabs that may need syncing
 */
export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get('agent_id');

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch recent conversations from ElevenLabs
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversations');
    if (agentId) {
      url.searchParams.set('agent_id', agentId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Xi-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Get existing conversation IDs from Supabase
    const supabase = createServerClient();
    const { data: existingSubmissions } = await supabase
      .from('submissions')
      .select('conversation_id');

    const existingIds = new Set(existingSubmissions?.map(s => s.conversation_id) || []);

    // Mark which ones are missing
    const conversations = (data.conversations || []).map((conv: { conversation_id: string }) => ({
      ...conv,
      synced: existingIds.has(conv.conversation_id),
    }));

    return NextResponse.json({
      conversations,
      total: conversations.length,
      missing: conversations.filter((c: { synced: boolean }) => !c.synced).length,
    });

  } catch (error) {
    console.error('[Sync] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
