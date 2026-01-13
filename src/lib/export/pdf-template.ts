import type {
  SubmissionWithDetails,
  HealthProblemRequest,
  RepeatPrescriptionRequest,
  FitNoteRequest,
  RoutineCareRequest,
  TestResultsRequest,
  ReferralFollowupRequest,
  DoctorsLetterRequest,
  OtherAdminRequest,
  RequestData,
} from '@/types';

/**
 * Generates a reference number for the submission
 */
function generateReferenceNumber(submission: SubmissionWithDetails): string {
  const date = new Date(submission.call_timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const shortId = submission.id.slice(0, 6).toUpperCase();
  return `REF-${year}${month}${day}-${shortId}`;
}

/**
 * Formats a date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats call duration
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} sec`;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Generates HTML for health problem request details
 */
function renderHealthProblemDetails(data: HealthProblemRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Problem Description:</span>
      <span class="value">${escapeHtml(data.description) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Duration:</span>
      <span class="value">${escapeHtml(data.duration) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Progression:</span>
      <span class="value">${escapeHtml(data.progression) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Treatments Tried:</span>
      <span class="value">${escapeHtml(data.treatments_tried) || 'None mentioned'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Patient Concerns:</span>
      <span class="value">${escapeHtml(data.concerns) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Help Requested:</span>
      <span class="value">${escapeHtml(data.help_requested) || 'Not specified'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Best Contact Times:</span>
      <span class="value">${escapeHtml(data.best_contact_times) || 'Any time'}</span>
    </div>
  `;
}

/**
 * Generates HTML for repeat prescription request details
 */
function renderPrescriptionDetails(data: RepeatPrescriptionRequest): string {
  const medications = data.medications && data.medications.length > 0
    ? data.medications.map(med => {
        if (typeof med === 'string') return escapeHtml(med);
        return `${escapeHtml(med.name || '')}${med.strength ? ` (${escapeHtml(med.strength)})` : ''}`;
      }).join('<br>')
    : 'Not specified';

  return `
    <div class="detail-row">
      <span class="label">Medications Requested:</span>
      <span class="value">${medications}</span>
    </div>
    <div class="detail-row">
      <span class="label">Additional Notes:</span>
      <span class="value">${escapeHtml(data.additional_notes) || 'None'}</span>
    </div>
  `;
}

/**
 * Generates HTML for fit note request details
 */
function renderFitNoteDetails(data: FitNoteRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Had Previous Note:</span>
      <span class="value">${data.had_previous_note ? 'Yes' : 'No'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Illness Description:</span>
      <span class="value">${escapeHtml(data.illness_description) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Start Date:</span>
      <span class="value">${escapeHtml(data.start_date) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">End Date:</span>
      <span class="value">${escapeHtml(data.end_date) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Employer Accommodations:</span>
      <span class="value">${escapeHtml(data.employer_accommodations) || 'None specified'}</span>
    </div>
  `;
}

/**
 * Generates HTML for routine care request details
 */
function renderRoutineCareDetails(data: RoutineCareRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Care Type:</span>
      <span class="value">${escapeHtml(data.care_type) || 'Not specified'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Additional Details:</span>
      <span class="value">${escapeHtml(data.additional_details) || 'None'}</span>
    </div>
  `;
}

/**
 * Generates HTML for test results request details
 */
function renderTestResultsDetails(data: TestResultsRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Test Type:</span>
      <span class="value">${escapeHtml(data.test_type) || 'Not specified'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Test Date:</span>
      <span class="value">${escapeHtml(data.test_date) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Test Location:</span>
      <span class="value">${escapeHtml(data.test_location) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Reason for Test:</span>
      <span class="value">${escapeHtml(data.reason_for_test) || 'Not provided'}</span>
    </div>
  `;
}

/**
 * Generates HTML for referral followup request details
 */
function renderReferralDetails(data: ReferralFollowupRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Referral For:</span>
      <span class="value">${escapeHtml(data.referral_for) || 'Not specified'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Referral Date:</span>
      <span class="value">${escapeHtml(data.referral_date) || 'Not provided'}</span>
    </div>
    <div class="detail-row">
      <span class="label">NHS or Private:</span>
      <span class="value">${data.nhs_or_private?.toUpperCase() || 'Not specified'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Help Needed:</span>
      <span class="value">${escapeHtml(data.help_needed) || 'Not specified'}</span>
    </div>
  `;
}

/**
 * Generates HTML for doctor's letter request details
 */
function renderDoctorsLetterDetails(data: DoctorsLetterRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Letter Purpose:</span>
      <span class="value">${escapeHtml(data.letter_purpose) || 'Not specified'}</span>
    </div>
    <div class="detail-row">
      <span class="label">Deadline:</span>
      <span class="value">${escapeHtml(data.deadline) || 'Not specified'}</span>
    </div>
    <p class="note-content" style="margin-top: 10px; color: #b45309;">Note: There may be a charge for this service.</p>
  `;
}

/**
 * Generates HTML for other admin request details
 */
function renderOtherAdminDetails(data: OtherAdminRequest): string {
  return `
    <div class="detail-row">
      <span class="label">Description:</span>
      <span class="value">${escapeHtml(data.description) || 'Not provided'}</span>
    </div>
  `;
}

/**
 * Renders request details based on type
 */
function renderRequestDetails(type: string | null, data: RequestData | null): string {
  if (!type || !data) {
    return '<p class="no-data">No request details available.</p>';
  }

  switch (data.type) {
    case 'health_problem':
      return renderHealthProblemDetails(data);
    case 'repeat_prescription':
      return renderPrescriptionDetails(data);
    case 'fit_note':
      return renderFitNoteDetails(data);
    case 'routine_care':
      return renderRoutineCareDetails(data);
    case 'test_results':
      return renderTestResultsDetails(data);
    case 'referral_followup':
      return renderReferralDetails(data);
    case 'doctors_letter':
      return renderDoctorsLetterDetails(data);
    case 'other_admin':
      return renderOtherAdminDetails(data);
    default:
      return '<p class="no-data">No request details available.</p>';
  }
}

/**
 * Gets the label for request type
 */
function getRequestTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    health_problem: 'Health Problem',
    repeat_prescription: 'Repeat Prescription',
    fit_note: 'Fit (Sick) Note',
    routine_care: 'Routine Care',
    test_results: 'Test Results',
    referral_followup: 'Referral Follow-up',
    doctors_letter: "Doctor's Letter",
    other_admin: 'Other Admin Request',
  };
  return type ? (labels[type] || 'Not Specified') : 'Not Specified';
}

/**
 * Generates HTML for staff notes
 */
function renderNotes(notes: SubmissionWithDetails['notes']): string {
  if (!notes || notes.length === 0) {
    return '<p class="no-data">No staff notes recorded.</p>';
  }

  return notes.map(note => {
    const date = new Date(note.created_at);
    const dateStr = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const typeLabel = note.note_type.replace('_', ' ').toUpperCase();

    return `
      <div class="note">
        <div class="note-header">
          <span class="note-type">${typeLabel}</span>
          <span class="note-date">${dateStr}</span>
        </div>
        <div class="note-content">${escapeHtml(note.content)}</div>
      </div>
    `;
  }).join('');
}

/**
 * Generates HTML for transcript
 */
function renderTranscript(transcript: string | null): string {
  if (!transcript) {
    return '<p class="no-data">No transcript available.</p>';
  }

  return `<pre class="transcript">${escapeHtml(transcript)}</pre>`;
}

export interface ExportOptions {
  includeTranscript?: boolean;
  includeNotes?: boolean;
  practiceName?: string;
}

/**
 * Generates the complete HTML document for PDF export
 */
export function generatePdfHtml(
  submission: SubmissionWithDetails,
  options: ExportOptions = {}
): string {
  const {
    includeTranscript = false,
    includeNotes = true,
    practiceName = 'Medical Practice',
  } = options;

  const referenceNumber = generateReferenceNumber(submission);
  const generatedAt = new Date().toLocaleString('en-GB');
  const patientName = `${submission.patient_data.first_name} ${submission.patient_data.last_name}`.trim() || 'Not provided';

  const emergencyStatus = submission.patient_data.emergency_confirmed
    ? '<span class="status-ok">No Emergency</span>'
    : '<span class="status-alert">POSSIBLE EMERGENCY - REVIEW REQUIRED</span>';

  const requestTypeLabel = getRequestTypeLabel(submission.request_type);
  const requestDetails = renderRequestDetails(submission.request_type, submission.request_data);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Patient Request - ${referenceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
      @top-right {
        content: "${referenceNumber}";
        font-size: 9pt;
        color: #666;
      }
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        color: #666;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
    }

    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .practice-name {
      font-size: 14pt;
      font-weight: bold;
      color: #1e40af;
    }

    .document-title {
      font-size: 20pt;
      font-weight: bold;
      color: #111;
      margin-top: 10px;
    }

    .reference {
      font-size: 10pt;
      color: #666;
    }

    .generated-date {
      font-size: 9pt;
      color: #888;
      margin-top: 5px;
    }

    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1e40af;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-row {
      display: flex;
      margin-bottom: 8px;
    }

    .label {
      font-weight: 600;
      color: #555;
      min-width: 160px;
      flex-shrink: 0;
    }

    .value {
      color: #111;
    }

    .status-ok {
      color: #059669;
      font-weight: 600;
    }

    .status-alert {
      color: #dc2626;
      font-weight: bold;
      background: #fef2f2;
      padding: 2px 8px;
      border-radius: 3px;
    }

    .patient-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .note {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 12px;
      margin-bottom: 10px;
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 9pt;
    }

    .note-type {
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }

    .note-date {
      color: #666;
    }

    .note-content {
      color: #333;
    }

    .transcript {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: none;
    }

    .no-data {
      color: #888;
      font-style: italic;
    }

    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #888;
      text-align: center;
    }

    .call-info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .call-info-item {
      text-align: center;
    }

    .call-info-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
    }

    .call-info-value {
      font-size: 11pt;
      font-weight: 600;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="practice-name">${escapeHtml(practiceName)}</div>
        <div class="document-title">Patient Request Form</div>
      </div>
      <div style="text-align: right;">
        <div class="reference">${referenceNumber}</div>
        <div class="generated-date">Generated: ${generatedAt}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="patient-grid">
      <div class="detail-row">
        <span class="label">Full Name:</span>
        <span class="value">${escapeHtml(patientName)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Postcode:</span>
        <span class="value">${escapeHtml(submission.patient_data.postcode) || 'Not provided'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Phone Number:</span>
        <span class="value">${escapeHtml(submission.patient_data.phone_number) || 'Not provided'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Preferred Contact:</span>
        <span class="value" style="text-transform: capitalize;">${submission.patient_data.preferred_contact || 'Not specified'}</span>
      </div>
    </div>
    <div class="detail-row" style="margin-top: 15px;">
      <span class="label">Emergency Status:</span>
      <span class="value">${emergencyStatus}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Request Details - ${requestTypeLabel}</div>
    ${requestDetails}
  </div>

  ${includeNotes ? `
  <div class="section">
    <div class="section-title">Staff Notes</div>
    ${renderNotes(submission.notes)}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Call Information</div>
    <div class="call-info-grid">
      <div class="call-info-item">
        <div class="call-info-label">Date & Time</div>
        <div class="call-info-value">${formatDate(submission.call_timestamp)}</div>
      </div>
      <div class="call-info-item">
        <div class="call-info-label">Duration</div>
        <div class="call-info-value">${formatDuration(submission.call_duration_secs)}</div>
      </div>
      <div class="call-info-item">
        <div class="call-info-label">Conversation ID</div>
        <div class="call-info-value" style="font-size: 9pt;">${submission.conversation_id}</div>
      </div>
    </div>
  </div>

  ${includeTranscript ? `
  <div class="section">
    <div class="section-title">Call Transcript</div>
    ${renderTranscript(submission.transcript)}
  </div>
  ` : ''}

  <div class="footer">
    Generated by PrincetonAI Phone Agent | ${generatedAt}
  </div>
</body>
</html>
  `.trim();
}
