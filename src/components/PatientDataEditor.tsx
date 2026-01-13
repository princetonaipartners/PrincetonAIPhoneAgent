'use client';

import { useState } from 'react';
import type { PatientData, PreferredContact } from '@/types';

interface PatientDataEditorProps {
  submissionId: string;
  patientData: PatientData;
  onUpdate: () => void;
}

export function PatientDataEditor({ submissionId, patientData, onUpdate }: PatientDataEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<PatientData>(patientData);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_data: data, edit_reason: reason || undefined }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        onUpdate();
        setIsEditing(false);
        setReason('');
      } else {
        setError(result.error || 'Failed to update patient data');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setData(patientData);
    setReason('');
    setError(null);
  };

  if (!isEditing) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-0 right-0 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit
        </button>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">First Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{data.first_name || <span className="text-gray-400 italic">Not provided</span>}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{data.last_name || <span className="text-gray-400 italic">Not provided</span>}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Postcode</dt>
            <dd className="mt-1 text-sm text-gray-900">{data.postcode || <span className="text-gray-400 italic">Not provided</span>}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{data.phone_number || <span className="text-gray-400 italic">Not provided</span>}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Preferred Contact</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{data.preferred_contact || <span className="text-gray-400 italic">Not provided</span>}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Emergency Status</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {data.emergency_confirmed ? (
                <span className="text-green-600">No - Not an emergency</span>
              ) : (
                <span className="text-red-600 font-medium">Possible Emergency - Review Required</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            value={data.first_name}
            onChange={(e) => setData({ ...data, first_name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            value={data.last_name}
            onChange={(e) => setData({ ...data, last_name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
          <input
            type="text"
            value={data.postcode}
            onChange={(e) => setData({ ...data, postcode: e.target.value.toUpperCase() })}
            placeholder="e.g., SW1A 1AA"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            value={data.phone_number}
            onChange={(e) => setData({ ...data, phone_number: e.target.value })}
            placeholder="e.g., 07700 900123"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
          <select
            value={data.preferred_contact}
            onChange={(e) => setData({ ...data, preferred_contact: e.target.value as PreferredContact })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="phone">Phone</option>
            <option value="text">Text</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Status</label>
          <select
            value={data.emergency_confirmed ? 'true' : 'false'}
            onChange={(e) => setData({ ...data, emergency_confirmed: e.target.value === 'true' })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="true">No - Not an emergency</option>
            <option value="false">Possible Emergency</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for edit (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Corrected typo in postcode"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          {saving ? 'Saving...' : 'Save Changes'}
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
