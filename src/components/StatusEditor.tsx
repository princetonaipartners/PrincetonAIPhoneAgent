'use client';

import { useState } from 'react';
import type { SubmissionStatus } from '@/types';

interface StatusEditorProps {
  submissionId: string;
  currentStatus: SubmissionStatus;
  onUpdate: () => void;
}

const statusOptions: { value: SubmissionStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'requires_review', label: 'Requires Review', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function StatusEditor({ submissionId, currentStatus, onUpdate }: StatusEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (status === currentStatus) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, edit_reason: reason || undefined }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onUpdate();
        setIsEditing(false);
        setReason('');
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setStatus(currentStatus);
    setReason('');
    setError(null);
  };

  if (!isEditing) {
    const current = statusOptions.find((s) => s.value === currentStatus);
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${current?.color} hover:opacity-80 transition-opacity`}
      >
        {current?.label}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for change (optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Reviewed by Dr. Smith"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
