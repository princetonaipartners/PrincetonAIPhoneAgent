import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  validateWebhookSignature,
  parseWebhookPayload,
  extractPatientData,
  extractRequestData,
  formatTranscript,
  determineStatus,
} from '@/lib/elevenlabs/webhook';

/**
 * POST /api/webhooks/elevenlabs
 *
 * Receives post-call webhook from ElevenLabs Conversational AI
 * Validates signature, parses payload, and stores in Supabase
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature validation
    const body = await request.text();

    // Get signature header
    const signature = request.headers.get('ElevenLabs-Signature');

    // Get webhook secret
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Webhook] Missing ELEVENLABS_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate signature
    const signatureResult = validateWebhookSignature(signature, body, webhookSecret);

    if (!signatureResult.valid) {
      console.error('[Webhook] Signature validation failed:', signatureResult.error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse payload
    const parseResult = parseWebhookPayload(body);

    if (!parseResult.success || !parseResult.payload) {
      console.error('[Webhook] Payload parsing failed:', parseResult.error);
      return NextResponse.json(
        { error: parseResult.error },
        { status: 400 }
      );
    }

    const payload = parseResult.payload;
    const { data } = payload;

    console.log(`[Webhook] Processing conversation: ${data.conversation_id}`);

    // Create Supabase client
    const supabase = createServerClient();

    // Log webhook receipt
    await supabase.from('call_logs').insert({
      conversation_id: data.conversation_id,
      event_type: 'webhook_received',
      payload: { type: payload.type, status: data.status },
    });

    // Extract structured data (pass transcript for emergency detection)
    const patientData = extractPatientData(data.analysis, data.transcript);
    const { types: requestTypes, data: requestData } = extractRequestData(data.analysis);
    const transcript = formatTranscript(data.transcript);
    const status = determineStatus(data.analysis, data.status);

    // Debug logging for multi-request
    console.log(`[Webhook] Raw request_type from ElevenLabs:`, data.analysis?.data_collection_results?.request_type);
    console.log(`[Webhook] Parsed requestTypes:`, requestTypes);
    console.log(`[Webhook] Parsed requestData:`, JSON.stringify(requestData, null, 2));

    // Prepare submission record
    // request_type is comma-separated for multi-request calls (e.g., "fit_note,repeat_prescription")
    // request_data is keyed object for multi-request (e.g., { fit_note: {...}, repeat_prescription: {...} })
    const submission = {
      conversation_id: data.conversation_id,
      agent_id: data.agent_id,
      call_timestamp: new Date(data.metadata.start_time_unix_secs * 1000).toISOString(),
      call_duration_secs: data.metadata.call_duration_secs,
      caller_phone: patientData.phone_number || null,
      status,
      patient_data: patientData,
      request_type: requestTypes.length > 0 ? requestTypes.join(',') : null,
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
      console.error('[Webhook] Database error:', upsertError);

      // Log error
      await supabase.from('call_logs').insert({
        conversation_id: data.conversation_id,
        event_type: 'error',
        payload: { error: upsertError.message },
      });

      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Log completion
    await supabase.from('call_logs').insert({
      conversation_id: data.conversation_id,
      event_type: 'completed',
      payload: {
        status,
        processing_time_ms: Date.now() - startTime,
      },
    });

    console.log(`[Webhook] Successfully processed: ${data.conversation_id} (${status})`);

    // Return 200 to acknowledge receipt
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/elevenlabs
 *
 * Health check endpoint for testing webhook URL is reachable
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'PrincetonAI Medical Phone Agent',
    webhook: 'elevenlabs',
    timestamp: new Date().toISOString(),
  });
}
