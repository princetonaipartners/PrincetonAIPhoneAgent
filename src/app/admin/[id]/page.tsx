import { createAnonClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Submission, HealthProblemRequest, RepeatPrescriptionRequest } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSubmission(id: string): Promise<Submission | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Submission;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} minutes ${secs} seconds`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-2">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}

function HealthProblemDetails({ data }: { data: HealthProblemRequest }) {
  return (
    <dl className="grid grid-cols-1 gap-4">
      <Field label="Problem Description" value={data.description} />
      <Field label="Duration" value={data.duration} />
      <Field label="Progression" value={data.progression} />
      <Field label="Treatments Tried" value={data.treatments_tried} />
      <Field label="Concerns" value={data.concerns} />
      <Field label="Help Requested" value={data.help_requested} />
      <Field label="Best Contact Times" value={data.best_contact_times} />
    </dl>
  );
}

function PrescriptionDetails({ data }: { data: RepeatPrescriptionRequest }) {
  return (
    <dl className="grid grid-cols-1 gap-4">
      <div className="py-2">
        <dt className="text-sm font-medium text-gray-500">Medications</dt>
        <dd className="mt-1">
          {data.medications && data.medications.length > 0 ? (
            <ul className="list-disc list-inside text-sm text-gray-900">
              {data.medications.map((med, index) => (
                <li key={index}>
                  {med.name} {med.strength && `(${med.strength})`}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-gray-500">No medications listed</span>
          )}
        </dd>
      </div>
      <Field label="Additional Notes" value={data.additional_notes} />
    </dl>
  );
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const submission = await getSubmission(id);

  if (!submission) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    requires_review: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {submission.patient_data.first_name} {submission.patient_data.last_name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(submission.call_timestamp)}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[submission.status]}`}>
              {submission.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Call Info */}
        <Section title="Call Information">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Duration" value={formatDuration(submission.call_duration_secs)} />
            <Field label="Conversation ID" value={submission.conversation_id} />
          </dl>
        </Section>

        {/* Patient Details */}
        <Section title="Patient Details">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="First Name" value={submission.patient_data.first_name} />
            <Field label="Last Name" value={submission.patient_data.last_name} />
            <Field label="Postcode" value={submission.patient_data.postcode} />
            <Field label="Phone" value={submission.patient_data.phone_number} />
            <Field label="Preferred Contact" value={submission.patient_data.preferred_contact} />
            <Field
              label="Emergency Confirmed"
              value={submission.patient_data.emergency_confirmed ? 'Yes - Not an emergency' : 'Not confirmed'}
            />
          </dl>
        </Section>

        {/* Request Details */}
        {submission.request_data && (
          <Section
            title={
              submission.request_type === 'health_problem'
                ? 'Health Problem Details'
                : 'Prescription Request Details'
            }
          >
            {submission.request_type === 'health_problem' ? (
              <HealthProblemDetails data={submission.request_data as HealthProblemRequest} />
            ) : (
              <PrescriptionDetails data={submission.request_data as RepeatPrescriptionRequest} />
            )}
          </Section>
        )}

        {/* Transcript */}
        {submission.transcript && (
          <Section title="Call Transcript">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {submission.transcript}
            </pre>
          </Section>
        )}

        {/* Raw Analysis (Debug) */}
        <details className="bg-white rounded-lg shadow-sm border">
          <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
            Raw Analysis Data (Debug)
          </summary>
          <div className="px-6 pb-6">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(submission.analysis, null, 2)}
            </pre>
          </div>
        </details>
      </main>
    </div>
  );
}
