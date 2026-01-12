import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { SubmissionDetail } from '@/components/SubmissionDetail';
import type { SubmissionWithDetails } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSubmission(id: string): Promise<SubmissionWithDetails | null> {
  const supabase = createServerClient();

  // Fetch submission
  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (submissionError || !submission) {
    return null;
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

  return {
    ...submission,
    notes: notes || [],
    edit_history: edits || [],
  } as SubmissionWithDetails;
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const submission = await getSubmission(id);

  if (!submission) {
    notFound();
  }

  return <SubmissionDetail initialData={submission} />;
}
