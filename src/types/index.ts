/**
 * Type definitions for PrincetonAI Medical Phone Agent
 */

// ============================================
// Patient Data Types
// ============================================

export type PreferredContact = 'text' | 'phone' | 'both';

export interface PatientData {
  first_name: string;
  last_name: string;
  postcode: string;
  phone_number: string;
  preferred_contact: PreferredContact;
  emergency_confirmed: boolean;
}

// ============================================
// Request Types
// ============================================

export type RequestType =
  | 'health_problem'
  | 'repeat_prescription'
  | 'fit_note'
  | 'routine_care'
  | 'test_results'
  | 'referral_followup'
  | 'doctors_letter'
  | 'other_admin';

export interface HealthProblemRequest {
  type: 'health_problem';
  description: string;
  duration: string;
  progression: string;
  treatments_tried: string;
  concerns: string;
  help_requested: string;
  best_contact_times: string;
}

export interface Medication {
  name: string;
  strength: string;
}

export interface RepeatPrescriptionRequest {
  type: 'repeat_prescription';
  medications: Medication[];
  additional_notes: string;
}

export interface FitNoteRequest {
  type: 'fit_note';
  had_previous_note: boolean;
  illness_description: string;
  start_date: string;
  end_date: string;
  employer_accommodations: string;
}

export interface RoutineCareRequest {
  type: 'routine_care';
  care_type: string; // e.g., "medication review", "vaccination", "screening"
  additional_details: string;
}

export interface TestResultsRequest {
  type: 'test_results';
  test_type: string;
  test_date: string;
  test_location: string;
  reason_for_test: string;
}

export interface ReferralFollowupRequest {
  type: 'referral_followup';
  referral_for: string;
  referral_date: string;
  nhs_or_private: 'nhs' | 'private';
  help_needed: string;
}

export interface DoctorsLetterRequest {
  type: 'doctors_letter';
  letter_purpose: string;
  deadline: string;
}

export interface OtherAdminRequest {
  type: 'other_admin';
  description: string;
}

export type RequestData =
  | HealthProblemRequest
  | RepeatPrescriptionRequest
  | FitNoteRequest
  | RoutineCareRequest
  | TestResultsRequest
  | ReferralFollowupRequest
  | DoctorsLetterRequest
  | OtherAdminRequest;

// Multi-request data structure - object with type keys for multiple request types in one call
export type MultiRequestData = {
  [K in RequestType]?: RequestData;
};

/**
 * Type guard to check if request_data is in the new multi-request format
 * Multi-request format: { fit_note: {...}, repeat_prescription: {...} }
 * Single-request format: { type: 'fit_note', ... }
 */
export function isMultiRequestData(data: unknown): data is MultiRequestData {
  if (!data || typeof data !== 'object') return false;
  // Single request data has a 'type' property at the top level
  // Multi-request data has keys like 'fit_note', 'health_problem', etc.
  return !('type' in data);
}

/**
 * Parse comma-separated request_type string into array of RequestType
 */
export function getRequestTypes(requestType: string | null): RequestType[] {
  if (!requestType) return [];
  const validTypes: RequestType[] = [
    'health_problem', 'repeat_prescription', 'fit_note',
    'routine_care', 'test_results', 'referral_followup',
    'doctors_letter', 'other_admin'
  ];
  return requestType
    .split(',')
    .map(t => t.trim() as RequestType)
    .filter(t => validTypes.includes(t));
}

// ============================================
// Submission Types
// ============================================

export type SubmissionStatus = 'pending' | 'completed' | 'failed' | 'requires_review';

export interface Submission {
  id: string;
  conversation_id: string;
  agent_id: string;
  call_timestamp: string;
  call_duration_secs: number | null;
  caller_phone: string | null;
  status: SubmissionStatus;
  patient_data: PatientData;
  request_type: string | null; // Comma-separated: "fit_note,repeat_prescription" or single "health_problem"
  request_data: RequestData | MultiRequestData | null; // Supports both old and new format
  transcript: string | null;
  analysis: ElevenLabsAnalysis | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// ElevenLabs Webhook Types
// ============================================

export interface ElevenLabsTranscriptEntry {
  role: 'agent' | 'user';
  message: string;
  time_in_call_secs: number;
}

export interface ElevenLabsMetadata {
  start_time_unix_secs: number;
  end_time_unix_secs: number;
  call_duration_secs: number;
  cost: number;
}

export interface ElevenLabsDataCollected {
  // Patient details
  patient_first_name?: string;
  patient_last_name?: string;
  patient_postcode?: string;
  patient_phone?: string;
  preferred_contact?: string;
  emergency_confirmed?: boolean;
  request_type?: string;

  // Health problem fields
  health_problem_description?: string;
  health_problem_duration?: string;
  health_problem_progression?: string;
  health_problem_tried?: string;
  health_problem_concerns?: string;
  health_problem_help_wanted?: string;
  best_contact_times?: string;

  // Repeat prescription fields
  medications_requested?: Medication[];
  prescription_notes?: string;

  // Fit note fields (consolidated to fit 25 variable limit)
  fit_note_previous?: boolean;
  fit_note_illness?: string;
  fit_note_dates_and_details?: string; // Contains dates + employer accommodations

  // Routine care fields (consolidated)
  routine_care_details?: string; // Contains type + details

  // Test results fields (consolidated)
  test_details?: string; // Contains type, date, location, reason

  // Referral followup fields (consolidated)
  referral_details?: string; // Contains for, date, nhs/private, help needed

  // Doctor's letter fields (consolidated)
  letter_details?: string; // Contains purpose + deadline

  // Other admin fields
  other_admin_description?: string;

  call_successful?: boolean;
}

export interface ElevenLabsAnalysis {
  call_successful: string; // "success", "failure", etc.
  data_collection_results: ElevenLabsDataCollected;
  evaluation_criteria_results?: Record<string, unknown>;
  transcript_summary?: string;
}

export interface ElevenLabsWebhookData {
  agent_id: string;
  conversation_id: string;
  status: 'done' | 'failed';
  transcript: ElevenLabsTranscriptEntry[];
  metadata: ElevenLabsMetadata;
  analysis: ElevenLabsAnalysis;
}

export interface ElevenLabsWebhookPayload {
  type: 'post_call_transcription' | 'post_call_audio' | 'call_initiation_failure';
  event_timestamp: number;
  data: ElevenLabsWebhookData;
}

// ============================================
// Call Log Types
// ============================================

export type CallLogEventType = 'webhook_received' | 'processing' | 'completed' | 'error';

export interface CallLog {
  id: string;
  conversation_id: string;
  event_type: CallLogEventType;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PostcodeValidationResult {
  valid: boolean;
  formatted: string;
  error?: string;
}

// ============================================
// Submission Notes Types
// ============================================

export type NoteType = 'general' | 'follow_up' | 'clinical' | 'correction';

export interface SubmissionNote {
  id: string;
  submission_id: string;
  note_type: NoteType;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Edit History Types
// ============================================

export interface SubmissionEdit {
  id: string;
  submission_id: string;
  field_path: string;
  old_value: unknown;
  new_value: unknown;
  edit_reason: string | null;
  edited_by: string | null;
  created_at: string;
}

// ============================================
// Extended Submission Type
// ============================================

export interface SubmissionWithDetails extends Submission {
  notes?: SubmissionNote[];
  edit_history?: SubmissionEdit[];
  last_edited_at?: string | null;
  edit_count?: number;
}

// ============================================
// Update Request Types
// ============================================

export interface UpdateSubmissionRequest {
  status?: SubmissionStatus;
  patient_data?: Partial<PatientData>;
  request_type?: RequestType;
  request_data?: Partial<RequestData>;
  edit_reason?: string;
}

export interface AddNoteRequest {
  note_type: NoteType;
  content: string;
  created_by?: string;
}
