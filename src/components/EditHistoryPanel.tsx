'use client';

import type { SubmissionEdit } from '@/types';

interface EditHistoryPanelProps {
  edits: SubmissionEdit[];
}

export function EditHistoryPanel({ edits }: EditHistoryPanelProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatValue = (value: unknown, fieldPath?: string): string => {
    if (value === null || value === undefined || value === '') return '(empty)';

    // Special handling for emergency_confirmed field
    // true = patient confirmed NOT an emergency (safe)
    // false = possible emergency (needs review)
    if (fieldPath === 'patient_data.emergency_confirmed' && typeof value === 'boolean') {
      return value ? 'No Emergency' : 'Possible Emergency';
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const formatFieldPath = (path: string): string => {
    return path
      .replace('patient_data.', 'Patient ')
      .replace('request_data.', 'Request ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (edits.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No edit history. This submission has not been modified.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {edits.map((edit) => (
        <div key={edit.id} className="p-3 bg-gray-50 rounded-lg border text-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="font-medium text-gray-900">{formatFieldPath(edit.field_path)}</span>
            <span className="text-xs text-gray-500">{formatDate(edit.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 flex-wrap">
            <span className="line-through text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              {formatValue(edit.old_value, edit.field_path)}
            </span>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              {formatValue(edit.new_value, edit.field_path)}
            </span>
          </div>
          {edit.edit_reason && (
            <p className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Reason:</span> {edit.edit_reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
