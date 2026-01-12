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

export type RequestType = 'health_problem' | 'repeat_prescription';

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

export type RequestData = HealthProblemRequest | RepeatPrescriptionRequest;

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
  request_type: RequestType | null;
  request_data: RequestData | null;
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
  patient_first_name?: string;
  patient_last_name?: string;
  patient_postcode?: string;
  patient_phone?: string;
  preferred_contact?: string;
  emergency_confirmed?: boolean;
  request_type?: string;
  health_problem_description?: string;
  health_problem_duration?: string;
  health_problem_progression?: string;
  health_problem_tried?: string;
  health_problem_concerns?: string;
  health_problem_help_wanted?: string;
  best_contact_times?: string;
  medications_requested?: Medication[];
  prescription_notes?: string;
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
