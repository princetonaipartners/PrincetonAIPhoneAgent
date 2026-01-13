'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ActionBanner } from './ActionBanner';
import { StatusEditor } from './StatusEditor';
import { PatientDataEditor } from './PatientDataEditor';
import { RequestDataEditor } from './RequestDataEditor';
import { NotesPanel } from './NotesPanel';
import { EditHistoryPanel } from './EditHistoryPanel';
import { ExportButton } from './ExportButton';
import type { SubmissionWithDetails, HealthProblemRequest, RepeatPrescriptionRequest } from '@/types';

interface SubmissionDetailProps {
  initialData: SubmissionWithDetails;
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

export function SubmissionDetail({ initialData }: SubmissionDetailProps) {
  const [submission, setSubmission] = useState<SubmissionWithDetails>(initialData);
  const [loading, setLoading] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submission.id}`);
      const result = await res.json();
      if (result.success && result.data) {
        setSubmission(result.data);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  }, [submission.id]);

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
                {submission.patient_data.first_name || submission.patient_data.last_name
                  ? `${submission.patient_data.first_name} ${submission.patient_data.last_name}`.trim()
                  : 'Unknown Patient'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(submission.call_timestamp)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton submissionId={submission.id} />
              <StatusEditor
                submissionId={submission.id}
                currentStatus={submission.status}
                onUpdate={refreshData}
              />
            </div>
          </div>
          {loading && (
            <div className="mt-2 text-sm text-blue-600">Refreshing...</div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Action Banner for urgent items */}
        <ActionBanner
          submissionId={submission.id}
          status={submission.status}
          isEmergency={submission.patient_data.emergency_confirmed === false}
          onUpdate={refreshData}
        />

        {/* Call Info */}
        <Section title="Call Information">
          <dl className="grid grid-cols-2 gap-4">
            <div className="py-2">
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDuration(submission.call_duration_secs)}</dd>
            </div>
            <div className="py-2">
              <dt className="text-sm font-medium text-gray-500">Conversation ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">{submission.conversation_id}</dd>
            </div>
            {submission.edit_count && submission.edit_count > 0 && (
              <div className="py-2">
                <dt className="text-sm font-medium text-gray-500">Edit Count</dt>
                <dd className="mt-1 text-sm text-gray-900">{submission.edit_count} edits</dd>
              </div>
            )}
            {submission.last_edited_at && (
              <div className="py-2">
                <dt className="text-sm font-medium text-gray-500">Last Edited</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(submission.last_edited_at)}</dd>
              </div>
            )}
          </dl>
        </Section>

        {/* Patient Details */}
        <Section title="Patient Details">
          <PatientDataEditor
            submissionId={submission.id}
            patientData={submission.patient_data}
            onUpdate={refreshData}
          />
        </Section>

        {/* Request Details */}
        <Section title={submission.request_type === 'health_problem' ? 'Health Problem Details' : submission.request_type === 'repeat_prescription' ? 'Prescription Request Details' : 'Request Details'}>
          <RequestDataEditor
            submissionId={submission.id}
            requestType={submission.request_type}
            requestData={submission.request_data}
            onUpdate={refreshData}
          />
        </Section>

        {/* Notes */}
        <div id="notes">
          <Section title="">
            <NotesPanel
              submissionId={submission.id}
              notes={submission.notes || []}
              onUpdate={refreshData}
            />
          </Section>
        </div>

        {/* Transcript */}
        {submission.transcript && (
          <Section title="Call Transcript">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {submission.transcript}
            </pre>
          </Section>
        )}

        {/* Edit History */}
        {submission.edit_history && submission.edit_history.length > 0 && (
          <details className="bg-white rounded-lg shadow-sm border">
            <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              Edit History ({submission.edit_history.length} changes)
            </summary>
            <div className="px-6 pb-6">
              <EditHistoryPanel edits={submission.edit_history} />
            </div>
          </details>
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
