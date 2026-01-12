import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { UpdateSubmissionRequest, SubmissionEdit, Submission } from '@/types';

/**
 * GET /api/submissions/[id]
 * Fetch a single submission with notes and edit history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Fetch notes
    const { data: notes } = await supabase
      .from('submission_notes')
      .select('*')
      .eq('submission_id', id)
      .order('created_at', { ascending: false });

    // Fetch edit history
    const { data: edits } = await supabase
      .from('submission_edits')
      .select('*')
      .eq('submission_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        ...submission,
        notes: notes || [],
        edit_history: edits || [],
      },
    });
  } catch (error) {
    console.error('[API] Error fetching submission:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/submissions/[id]
 * Update a submission (status, patient_data, request_data)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateSubmissionRequest = await request.json();
    const supabase = createServerClient();

    // Fetch current submission for edit history
    const { data: current, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Build update object and track edits
    const updates: Record<string, unknown> = {
      last_edited_at: new Date().toISOString(),
      edit_count: (current.edit_count || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const edits: Omit<SubmissionEdit, 'id' | 'created_at'>[] = [];

    // Track status change
    if (body.status && body.status !== current.status) {
      edits.push({
        submission_id: id,
        field_path: 'status',
        old_value: current.status,
        new_value: body.status,
        edit_reason: body.edit_reason || null,
        edited_by: null,
      });
      updates.status = body.status;
    }

    // Track patient_data changes
    if (body.patient_data) {
      const currentPatientData = current.patient_data as Record<string, unknown> || {};
      const newPatientData = { ...currentPatientData, ...body.patient_data };

      for (const [key, value] of Object.entries(body.patient_data)) {
        if (currentPatientData[key] !== value) {
          edits.push({
            submission_id: id,
            field_path: `patient_data.${key}`,
            old_value: currentPatientData[key],
            new_value: value,
            edit_reason: body.edit_reason || null,
            edited_by: null,
          });
        }
      }
      updates.patient_data = newPatientData;
    }

    // Track request_type change
    if (body.request_type !== undefined && body.request_type !== current.request_type) {
      edits.push({
        submission_id: id,
        field_path: 'request_type',
        old_value: current.request_type,
        new_value: body.request_type,
        edit_reason: body.edit_reason || null,
        edited_by: null,
      });
      updates.request_type = body.request_type;
    }

    // Track request_data changes
    if (body.request_data) {
      const currentRequestData = current.request_data as Record<string, unknown> || {};
      const newRequestData = { ...currentRequestData, ...body.request_data };

      for (const [key, value] of Object.entries(body.request_data)) {
        if (JSON.stringify(currentRequestData[key]) !== JSON.stringify(value)) {
          edits.push({
            submission_id: id,
            field_path: `request_data.${key}`,
            old_value: currentRequestData[key],
            new_value: value,
            edit_reason: body.edit_reason || null,
            edited_by: null,
          });
        }
      }
      updates.request_data = newRequestData;
    }

    // Update submission
    const { error: updateError } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('[API] Error updating submission:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    // Insert edit history records
    if (edits.length > 0) {
      const { error: editError } = await supabase
        .from('submission_edits')
        .insert(edits);

      if (editError) {
        console.error('[API] Error recording edit history:', editError);
        // Continue even if edit history fails - the update succeeded
      }
    }

    // Fetch updated submission
    const { data: updated } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[API] Error updating submission:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
