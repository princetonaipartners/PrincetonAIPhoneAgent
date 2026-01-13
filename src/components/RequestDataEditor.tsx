'use client';

import { useState } from 'react';
import type {
  RequestType,
  RequestData,
  HealthProblemRequest,
  RepeatPrescriptionRequest,
  FitNoteRequest,
  RoutineCareRequest,
  TestResultsRequest,
  ReferralFollowupRequest,
  DoctorsLetterRequest,
  OtherAdminRequest,
  Medication,
} from '@/types';

interface RequestDataEditorProps {
  submissionId: string;
  requestType: RequestType | null;
  requestData: RequestData | null;
  onUpdate: () => void;
}

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  health_problem: 'Health Problem',
  repeat_prescription: 'Repeat Prescription',
  fit_note: 'Fit (Sick) Note',
  routine_care: 'Routine Care',
  test_results: 'Test Results',
  referral_followup: 'Referral Follow-up',
  doctors_letter: "Doctor's Letter",
  other_admin: 'Other Admin Request',
};

function createEmptyData(type: RequestType): RequestData {
  switch (type) {
    case 'health_problem':
      return {
        type: 'health_problem',
        description: '',
        duration: '',
        progression: '',
        treatments_tried: '',
        concerns: '',
        help_requested: '',
        best_contact_times: '',
      };
    case 'repeat_prescription':
      return {
        type: 'repeat_prescription',
        medications: [],
        additional_notes: '',
      };
    case 'fit_note':
      return {
        type: 'fit_note',
        had_previous_note: false,
        illness_description: '',
        start_date: '',
        end_date: '',
        employer_accommodations: '',
      };
    case 'routine_care':
      return {
        type: 'routine_care',
        care_type: '',
        additional_details: '',
      };
    case 'test_results':
      return {
        type: 'test_results',
        test_type: '',
        test_date: '',
        test_location: '',
        reason_for_test: '',
      };
    case 'referral_followup':
      return {
        type: 'referral_followup',
        referral_for: '',
        referral_date: '',
        nhs_or_private: 'nhs',
        help_needed: '',
      };
    case 'doctors_letter':
      return {
        type: 'doctors_letter',
        letter_purpose: '',
        deadline: '',
      };
    case 'other_admin':
      return {
        type: 'other_admin',
        description: '',
      };
  }
}

function DisplayField({ label, value }: { label: string; value: string | boolean | undefined }) {
  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">
        {displayValue || <span className="text-gray-400 italic">Not provided</span>}
      </dd>
    </div>
  );
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
    } else {
      setType(newType);
      setData(createEmptyData(newType));
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

  const updateField = (field: string, value: unknown) => {
    if (data) {
      setData({ ...data, [field]: value } as RequestData);
    }
  };

  // Medication helpers for repeat prescription
  const addMedication = () => {
    if (data?.type === 'repeat_prescription') {
      setData({
        ...data,
        medications: [...data.medications, { name: '', strength: '' }],
      });
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    if (data?.type === 'repeat_prescription') {
      const meds = [...data.medications];
      meds[index] = { ...meds[index], [field]: value };
      setData({ ...data, medications: meds });
    }
  };

  const removeMedication = (index: number) => {
    if (data?.type === 'repeat_prescription') {
      setData({
        ...data,
        medications: data.medications.filter((_, i) => i !== index),
      });
    }
  };

  // Display view (not editing)
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
        ) : (
          <dl className="space-y-3">
            {/* Health Problem Display */}
            {data?.type === 'health_problem' && (
              <>
                <DisplayField label="Description" value={data.description} />
                <div className="grid grid-cols-2 gap-4">
                  <DisplayField label="Duration" value={data.duration} />
                  <DisplayField label="Progression" value={data.progression} />
                </div>
                <DisplayField label="Treatments Tried" value={data.treatments_tried} />
                <DisplayField label="Concerns" value={data.concerns} />
                <DisplayField label="Help Requested" value={data.help_requested} />
                <DisplayField label="Best Contact Times" value={data.best_contact_times} />
              </>
            )}

            {/* Repeat Prescription Display */}
            {data?.type === 'repeat_prescription' && (
              <>
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
                <DisplayField label="Additional Notes" value={data.additional_notes} />
              </>
            )}

            {/* Fit Note Display */}
            {data?.type === 'fit_note' && (
              <>
                <DisplayField label="Had Previous Note" value={data.had_previous_note} />
                <DisplayField label="Illness Description" value={data.illness_description} />
                <div className="grid grid-cols-2 gap-4">
                  <DisplayField label="Start Date" value={data.start_date} />
                  <DisplayField label="End Date" value={data.end_date} />
                </div>
                <DisplayField label="Employer Accommodations" value={data.employer_accommodations} />
              </>
            )}

            {/* Routine Care Display */}
            {data?.type === 'routine_care' && (
              <>
                <DisplayField label="Care Type" value={data.care_type} />
                <DisplayField label="Additional Details" value={data.additional_details} />
              </>
            )}

            {/* Test Results Display */}
            {data?.type === 'test_results' && (
              <>
                <DisplayField label="Test Type" value={data.test_type} />
                <div className="grid grid-cols-2 gap-4">
                  <DisplayField label="Test Date" value={data.test_date} />
                  <DisplayField label="Test Location" value={data.test_location} />
                </div>
                <DisplayField label="Reason for Test" value={data.reason_for_test} />
              </>
            )}

            {/* Referral Follow-up Display */}
            {data?.type === 'referral_followup' && (
              <>
                <DisplayField label="Referral For" value={data.referral_for} />
                <div className="grid grid-cols-2 gap-4">
                  <DisplayField label="Referral Date" value={data.referral_date} />
                  <DisplayField label="NHS or Private" value={data.nhs_or_private?.toUpperCase()} />
                </div>
                <DisplayField label="Help Needed" value={data.help_needed} />
              </>
            )}

            {/* Doctor's Letter Display */}
            {data?.type === 'doctors_letter' && (
              <>
                <DisplayField label="Letter Purpose" value={data.letter_purpose} />
                <DisplayField label="Deadline" value={data.deadline} />
              </>
            )}

            {/* Other Admin Display */}
            {data?.type === 'other_admin' && (
              <DisplayField label="Description" value={data.description} />
            )}
          </dl>
        )}
      </div>
    );
  }

  // Edit view
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
          {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Health Problem Form */}
      {type === 'health_problem' && data?.type === 'health_problem' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateField('description', e.target.value)}
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
                onChange={(e) => updateField('duration', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progression</label>
              <select
                value={data.progression}
                onChange={(e) => updateField('progression', e.target.value)}
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
            <input type="text" value={data.treatments_tried} onChange={(e) => updateField('treatments_tried', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concerns</label>
            <input type="text" value={data.concerns} onChange={(e) => updateField('concerns', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help Requested</label>
            <input type="text" value={data.help_requested} onChange={(e) => updateField('help_requested', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Best Contact Times</label>
            <input type="text" value={data.best_contact_times} onChange={(e) => updateField('best_contact_times', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      {/* Repeat Prescription Form */}
      {type === 'repeat_prescription' && data?.type === 'repeat_prescription' && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Medications</label>
              <button type="button" onClick={addMedication} className="text-sm text-blue-600 hover:text-blue-800">+ Add medication</button>
            </div>
            {data.medications.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No medications added</p>
            ) : (
              <div className="space-y-2">
                {data.medications.map((med, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={med.name} onChange={(e) => updateMedication(i, 'name', e.target.value)} placeholder="Medication name" className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    <input type="text" value={med.strength} onChange={(e) => updateMedication(i, 'strength', e.target.value)} placeholder="Strength" className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    <button type="button" onClick={() => removeMedication(i)} className="text-red-500 hover:text-red-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea value={data.additional_notes} onChange={(e) => updateField('additional_notes', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      {/* Fit Note Form */}
      {type === 'fit_note' && data?.type === 'fit_note' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Had Previous Sick Note?</label>
            <select value={data.had_previous_note ? 'yes' : 'no'} onChange={(e) => updateField('had_previous_note', e.target.value === 'yes')} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Illness Description</label>
            <textarea value={data.illness_description} onChange={(e) => updateField('illness_description', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="text" value={data.start_date} onChange={(e) => updateField('start_date', e.target.value)} placeholder="e.g., 10 Jan 2026" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="text" value={data.end_date} onChange={(e) => updateField('end_date', e.target.value)} placeholder="e.g., 20 Jan 2026" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employer Accommodations</label>
            <input type="text" value={data.employer_accommodations} onChange={(e) => updateField('employer_accommodations', e.target.value)} placeholder="e.g., work from home, reduced hours" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      {/* Routine Care Form */}
      {type === 'routine_care' && data?.type === 'routine_care' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Type</label>
            <input type="text" value={data.care_type} onChange={(e) => updateField('care_type', e.target.value)} placeholder="e.g., medication review, vaccination" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
            <textarea value={data.additional_details} onChange={(e) => updateField('additional_details', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      {/* Test Results Form */}
      {type === 'test_results' && data?.type === 'test_results' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
            <input type="text" value={data.test_type} onChange={(e) => updateField('test_type', e.target.value)} placeholder="e.g., blood test, X-ray" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Date</label>
              <input type="text" value={data.test_date} onChange={(e) => updateField('test_date', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Location</label>
              <input type="text" value={data.test_location} onChange={(e) => updateField('test_location', e.target.value)} placeholder="e.g., Royal Hospital" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Test</label>
            <textarea value={data.reason_for_test} onChange={(e) => updateField('reason_for_test', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      {/* Referral Follow-up Form */}
      {type === 'referral_followup' && data?.type === 'referral_followup' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referral For</label>
            <input type="text" value={data.referral_for} onChange={(e) => updateField('referral_for', e.target.value)} placeholder="e.g., cardiology, physiotherapy" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Date</label>
              <input type="text" value={data.referral_date} onChange={(e) => updateField('referral_date', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NHS or Private</label>
              <select value={data.nhs_or_private} onChange={(e) => updateField('nhs_or_private', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="nhs">NHS</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help Needed</label>
            <textarea value={data.help_needed} onChange={(e) => updateField('help_needed', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      {/* Doctor's Letter Form */}
      {type === 'doctors_letter' && data?.type === 'doctors_letter' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Letter Purpose</label>
            <textarea value={data.letter_purpose} onChange={(e) => updateField('letter_purpose', e.target.value)} rows={2} placeholder="e.g., insurance claim, educational requirement" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input type="text" value={data.deadline} onChange={(e) => updateField('deadline', e.target.value)} placeholder="e.g., by end of month" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <p className="text-sm text-amber-600">Note: There may be a charge for this service.</p>
        </div>
      )}

      {/* Other Admin Form */}
      {type === 'other_admin' && data?.type === 'other_admin' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={data.description} onChange={(e) => updateField('description', e.target.value)} rows={3} placeholder="Describe your admin request" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for edit (optional)</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Corrected medication name" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={handleCancel} disabled={saving} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
