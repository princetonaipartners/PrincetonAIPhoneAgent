import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { AddNoteRequest } from '@/types';

/**
 * GET /api/submissions/[id]/notes
 * Fetch all notes for a submission
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: notes, error } = await supabase
      .from('submission_notes')
      .select('*')
      .eq('submission_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching notes:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('[API] Error fetching notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/submissions/[id]/notes
 * Add a new note to a submission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: AddNoteRequest = await request.json();
    const supabase = createServerClient();

    // Validate required fields
    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Validate note type
    const validNoteTypes = ['general', 'follow_up', 'clinical', 'correction'];
    if (!validNoteTypes.includes(body.note_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid note type' },
        { status: 400 }
      );
    }

    // Verify submission exists
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Insert note
    const { data: note, error: insertError } = await supabase
      .from('submission_notes')
      .insert({
        submission_id: id,
        note_type: body.note_type,
        content: body.content.trim(),
        created_by: body.created_by?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API] Error adding note:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to add note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error('[API] Error adding note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
