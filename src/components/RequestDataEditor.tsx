'use client';

import { useState } from 'react';
import type { RequestType, RequestData, HealthProblemRequest, RepeatPrescriptionRequest, Medication } from '@/types';

interface RequestDataEditorProps {
  submissionId: string;
  requestType: RequestType | null;
  requestData: RequestData | null;
  onUpdate: () => void;
}

export function RequestDataEditor({ submissionId, requestType, requestData, onUpdate }: RequestDataEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<RequestType | null>(requestType);
  const [data, setData] = useState<RequestData | null>(requestData);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (newType: RequestType | '') => {
    if (newType === '') {
      setType(null);
      setData(null);
    } else if (newType === 'health_problem') {
      setType('health_problem');
      setData({
        type: 'health_problem',
        description: '',
        duration: '',
        progression: '',
        treatments_tried: '',
        concerns: '',
        help_requested: '',
        best_contact_times: '',
      });
    } else {
      setType('repeat_prescription');
      setData({
        type: 'repeat_prescription',
        medications: [],
        additional_notes: '',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: type,
          request_data: data,
          edit_reason: reason || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        onUpdate();
        setIsEditing(false);
        setReason('');
      } else {
        setError(result.error || 'Failed to update request data');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setType(requestType);
    setData(requestData);
    setReason('');
    setError(null);
  };

  const updateHealthProblem = (field: keyof Omit<HealthProblemRequest, 'type'>, value: string) => {
    if (data && data.type === 'health_problem') {
      setData({ ...data, [field]: value });
    }
  };

  const updatePrescription = (field: keyof Omit<RepeatPrescriptionRequest, 'type' | 'medications'>, value: string) => {
    if (data && data.type === 'repeat_prescription') {
      setData({ ...data, [field]: value });
    }
  };

  const addMedication = () => {
    if (data && data.type === 'repeat_prescription') {
      setData({
        ...data,
        medications: [...data.medications, { name: '', strength: '' }],
      });
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    if (data && data.type === 'repeat_prescription') {
      const meds = [...data.medications];
      meds[index] = { ...meds[index], [field]: value };
      setData({ ...data, medications: meds });
    }
  };

  const removeMedication = (index: number) => {
    if (data && data.type === 'repeat_prescription') {
      setData({
        ...data,
        medications: data.medications.filter((_, i) => i !== index),
      });
    }
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

        {!requestType ? (
          <p className="text-gray-400 italic">No request type specified</p>
        ) : requestType === 'health_problem' && data?.type === 'health_problem' ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.description || <span className="text-gray-400 italic">Not provided</span>}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">{data.duration || <span className="text-gray-400 italic">Not provided</span>}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Progression</dt>
                <dd className="mt-1 text-sm text-gray-900">{data.progression || <span className="text-gray-400 italic">Not provided</span>}</dd>
              </div>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Treatments Tried</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.treatments_tried || <span className="text-gray-400 italic">Not provided</span>}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Concerns</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.concerns || <span className="text-gray-400 italic">Not provided</span>}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Help Requested</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.help_requested || <span className="text-gray-400 italic">Not provided</span>}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Best Contact Times</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.best_contact_times || <span className="text-gray-400 italic">Not provided</span>}</dd>
            </div>
          </dl>
        ) : data?.type === 'repeat_prescription' ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Medications</dt>
              <dd className="mt-1">
                {data.medications.length === 0 ? (
                  <span className="text-gray-400 italic text-sm">No medications listed</span>
                ) : (
                  <ul className="space-y-1">
                    {data.medications.map((med, i) => (
                      <li key={i} className="text-sm text-gray-900">
                        {med.name} {med.strength && `(${med.strength})`}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Additional Notes</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.additional_notes || <span className="text-gray-400 italic">Not provided</span>}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
        <select
          value={type || ''}
          onChange={(e) => handleTypeChange(e.target.value as RequestType | '')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Not specified</option>
          <option value="health_problem">Health Problem</option>
          <option value="repeat_prescription">Repeat Prescription</option>
        </select>
      </div>

      {type === 'health_problem' && data?.type === 'health_problem' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateHealthProblem('description', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input
                type="text"
                value={data.duration}
                onChange={(e) => updateHealthProblem('duration', e.target.value)}
                placeholder="e.g., 3 days"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progression</label>
              <select
                value={data.progression}
                onChange={(e) => updateHealthProblem('progression', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                <option value="getting better">Getting better</option>
                <option value="getting worse">Getting worse</option>
                <option value="staying the same">Staying the same</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatments Tried</label>
            <input
              type="text"
              value={data.treatments_tried}
              onChange={(e) => updateHealthProblem('treatments_tried', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concerns</label>
            <input
              type="text"
              value={data.concerns}
              onChange={(e) => updateHealthProblem('concerns', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help Requested</label>
            <input
              type="text"
              value={data.help_requested}
              onChange={(e) => updateHealthProblem('help_requested', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Best Contact Times</label>
            <input
              type="text"
              value={data.best_contact_times}
              onChange={(e) => updateHealthProblem('best_contact_times', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {type === 'repeat_prescription' && data?.type === 'repeat_prescription' && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Medications</label>
              <button
                type="button"
                onClick={addMedication}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add medication
              </button>
            </div>
            {data.medications.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No medications added</p>
            ) : (
              <div className="space-y-2">
                {data.medications.map((med, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => updateMedication(i, 'name', e.target.value)}
                      placeholder="Medication name"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={med.strength}
                      onChange={(e) => updateMedication(i, 'strength', e.target.value)}
                      placeholder="Strength"
                      className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeMedication(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={data.additional_notes}
              onChange={(e) => updatePrescription('additional_notes', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for edit (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Added missing medication"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
