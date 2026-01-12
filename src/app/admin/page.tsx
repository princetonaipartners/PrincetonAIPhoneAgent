import { createAnonClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Submission, SubmissionStatus, RequestType } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSubmissions(): Promise<Submission[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }

  return data as Submission[];
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const styles: Record<SubmissionStatus, string> = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    requires_review: 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function RequestTypeBadge({ type }: { type: RequestType | null }) {
  if (!type) return <span className="text-gray-400">-</span>;

  const styles: Record<RequestType, string> = {
    health_problem: 'bg-blue-100 text-blue-800',
    repeat_prescription: 'bg-purple-100 text-purple-800',
  };

  const labels: Record<RequestType, string> = {
    health_problem: 'Health Problem',
    repeat_prescription: 'Prescription',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default async function AdminPage() {
  const submissions = await getSubmissions();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Patient Submissions
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                PrincetonAI Medical Phone Agent - Admin Dashboard
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {submissions.length} submissions
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📞</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No submissions yet
            </h2>
            <p className="text-gray-500">
              Submissions will appear here once the voice agent receives calls.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => {
                  const hasName = submission.patient_data.first_name || submission.patient_data.last_name;
                  const patientName = hasName
                    ? `${submission.patient_data.first_name} ${submission.patient_data.last_name}`.trim()
                    : null;

                  return (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {patientName || <span className="text-gray-400 italic">Name not provided</span>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.patient_data.postcode || <span className="text-gray-400">No postcode</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RequestTypeBadge type={submission.request_type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(submission.call_duration_secs)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(submission.call_timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/${submission.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
