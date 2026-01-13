import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generatePdfHtml } from '@/lib/export/pdf-template';
import type { SubmissionWithDetails } from '@/types';

/**
 * POST /api/submissions/[id]/export
 *
 * Generates a PDF export of the submission using DocRaptor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const {
      includeTranscript = false,
      includeNotes = true,
      practiceName = 'Medical Practice',
    } = body;

    // Check for DocRaptor API key
    const docRaptorApiKey = process.env.DOCRAPTOR_API_KEY;
    if (!docRaptorApiKey) {
      console.error('[Export] Missing DOCRAPTOR_API_KEY');
      return NextResponse.json(
        { error: 'PDF service not configured' },
        { status: 500 }
      );
    }

    // Fetch submission with notes
    const supabase = createServerClient();

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Fetch notes if requested
    let notes = [];
    if (includeNotes) {
      const { data: notesData } = await supabase
        .from('submission_notes')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: true });

      notes = notesData || [];
    }

    const submissionWithDetails: SubmissionWithDetails = {
      ...submission,
      notes,
    };

    // Generate HTML
    const html = generatePdfHtml(submissionWithDetails, {
      includeTranscript,
      includeNotes,
      practiceName,
    });

    // Call DocRaptor API
    const docRaptorResponse = await fetch('https://docraptor.com/docs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_credentials: docRaptorApiKey,
        doc: {
          document_content: html,
          type: 'pdf',
          test: process.env.NODE_ENV !== 'production', // Use test mode in development
          prince_options: {
            media: 'print',
            baseurl: 'https://example.com',
          },
        },
      }),
    });

    if (!docRaptorResponse.ok) {
      const errorText = await docRaptorResponse.text();
      console.error('[Export] DocRaptor error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      );
    }

    // Get PDF buffer
    const pdfBuffer = await docRaptorResponse.arrayBuffer();

    // Generate filename
    const date = new Date(submission.call_timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const patientName = `${submission.patient_data.first_name}-${submission.patient_data.last_name}`.replace(/\s+/g, '-') || 'Unknown';
    const filename = `patient-request-${patientName}-${dateStr}.pdf`;

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('[Export] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/submissions/[id]/export
 *
 * Returns HTML preview (for debugging/preview purposes)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    const includeTranscript = searchParams.get('includeTranscript') === 'true';
    const includeNotes = searchParams.get('includeNotes') !== 'false';
    const practiceName = searchParams.get('practiceName') || 'Medical Practice';
    const format = searchParams.get('format') || 'html';

    // Fetch submission with notes
    const supabase = createServerClient();

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Fetch notes if requested
    let notes = [];
    if (includeNotes) {
      const { data: notesData } = await supabase
        .from('submission_notes')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: true });

      notes = notesData || [];
    }

    const submissionWithDetails: SubmissionWithDetails = {
      ...submission,
      notes,
    };

    // Generate HTML
    const html = generatePdfHtml(submissionWithDetails, {
      includeTranscript,
      includeNotes,
      practiceName,
    });

    if (format === 'json') {
      return NextResponse.json({
        html,
        submission: submissionWithDetails,
      });
    }

    // Return HTML for preview
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('[Export] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
