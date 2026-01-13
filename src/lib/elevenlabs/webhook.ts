import { createHmac, timingSafeEqual } from 'crypto';
import type {
  ElevenLabsWebhookPayload,
  PatientData,
  RequestData,
  HealthProblemRequest,
  RepeatPrescriptionRequest,
  RequestType,
  PreferredContact,
} from '@/types';

/**
 * Validates the ElevenLabs webhook signature
 *
 * Signature format: t=timestamp,v0=hash
 * Hash is HMAC-SHA256 of: timestamp.body using webhook secret
 */
export function validateWebhookSignature(
  signature: string | null,
  body: string,
  secret: string
): { valid: boolean; error?: string } {
  if (!signature) {
    return { valid: false, error: 'Missing signature header' };
  }

  try {
    // Parse signature: t=timestamp,v0=hash
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const hashPart = parts.find(p => p.startsWith('v0='));

    if (!timestampPart || !hashPart) {
      return { valid: false, error: 'Invalid signature format' };
    }

    const timestamp = timestampPart.substring(2);
    const providedHash = hashPart.substring(3);

    // Check timestamp is within 30 minutes
    const timestampSeconds = parseInt(timestamp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const thirtyMinutes = 30 * 60;

    if (Math.abs(nowSeconds - timestampSeconds) > thirtyMinutes) {
      return { valid: false, error: 'Signature timestamp expired' };
    }

    // Calculate expected hash
    const signaturePayload = `${timestamp}.${body}`;
    const expectedHash = createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    // Timing-safe comparison
    const providedBuffer = Buffer.from(providedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature' };
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Signature validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Parses and validates the webhook payload
 */
export function parseWebhookPayload(body: string): {
  success: boolean;
  payload?: ElevenLabsWebhookPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(body) as ElevenLabsWebhookPayload;

    // Validate required fields
    if (!parsed.type) {
      return { success: false, error: 'Missing type field' };
    }

    if (parsed.type !== 'post_call_transcription') {
      return { success: false, error: `Unsupported webhook type: ${parsed.type}` };
    }

    if (!parsed.data?.conversation_id) {
      return { success: false, error: 'Missing conversation_id' };
    }

    if (!parsed.data?.agent_id) {
      return { success: false, error: 'Missing agent_id' };
    }

    return { success: true, payload: parsed };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse payload: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Detects if patient indicated this IS an emergency from transcript
 * Returns true if emergency phrases are found in patient messages
 */
export function detectEmergencyFromTranscript(
  transcript: ElevenLabsWebhookPayload['data']['transcript']
): boolean {
  if (!transcript || transcript.length === 0) {
    return false;
  }

  const emergencyPhrases = [
    // Direct emergency statements
    'this is an emergency',
    'this is emergency',
    'i have an emergency',
    'i have emergency',
    'it is an emergency',
    'it is emergency',
    'is an emergency',
    'is emergency',
    'having an emergency',
    'having emergency',
    'yes emergency',
    'an emergency',
    'emergency i need',
    'emergency help',
    // Ambulance/999 related
    'need ambulance',
    'call 999',
    'call an ambulance',
    'need an ambulance',
    // Symptoms that indicate emergency
    'chest pain',
    'can\'t breathe',
    'cannot breathe',
    'cant breathe',
    'difficulty breathing',
    'hard to breathe',
    'severe bleeding',
    'heavy bleeding',
    'having a stroke',
    'signs of stroke',
    'heart attack',
    'unconscious',
    'passed out',
    'seizure',
    'choking',
  ];

  // Check patient messages only
  const patientMessages = transcript
    .filter(entry => entry.role === 'user')
    .map(entry => entry.message.toLowerCase());

  for (const message of patientMessages) {
    for (const phrase of emergencyPhrases) {
      if (message.includes(phrase)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts structured patient data from ElevenLabs analysis
 * If transcript indicates an emergency, overrides emergency_confirmed to false
 */
export function extractPatientData(
  analysis: ElevenLabsWebhookPayload['data']['analysis'],
  transcript?: ElevenLabsWebhookPayload['data']['transcript']
): PatientData {
  const data = analysis?.data_collection_results || {};

  // Check if ElevenLabs said it's not an emergency
  let emergencyConfirmed = parseBooleanValue(data.emergency_confirmed);

  // Override: if transcript shows patient said it IS an emergency, set to false
  if (transcript && detectEmergencyFromTranscript(transcript)) {
    emergencyConfirmed = false;
  }

  return {
    first_name: parseStringValue(data.patient_first_name) || '',
    last_name: parseStringValue(data.patient_last_name) || '',
    postcode: formatPostcode(parseStringValue(data.patient_postcode) || ''),
    phone_number: parseStringValue(data.patient_phone) || '',
    preferred_contact: parsePreferredContact(data.preferred_contact),
    emergency_confirmed: emergencyConfirmed,
  };
}

/**
 * Extracts request-specific data from ElevenLabs analysis
 */
export function extractRequestData(
  analysis: ElevenLabsWebhookPayload['data']['analysis']
): { type: RequestType | null; data: RequestData | null } {
  const collected = analysis?.data_collection_results;

  const requestTypeValue = parseStringValue(collected?.request_type);
  if (!requestTypeValue) {
    return { type: null, data: null };
  }

  // Normalize request type value
  const normalizedType = requestTypeValue.toLowerCase().replace(/[\s-]/g, '_');
  const requestType = normalizedType as RequestType;

  switch (requestType) {
    case 'health_problem':
      return {
        type: 'health_problem',
        data: {
          type: 'health_problem',
          description: parseStringValue(collected?.health_problem_description) || '',
          duration: parseStringValue(collected?.health_problem_duration) || '',
          progression: parseStringValue(collected?.health_problem_progression) || '',
          treatments_tried: parseStringValue(collected?.health_problem_tried) || '',
          concerns: parseStringValue(collected?.health_problem_concerns) || '',
          help_requested: parseStringValue(collected?.health_problem_help_wanted) || '',
          best_contact_times: parseStringValue(collected?.best_contact_times) || '',
        },
      };

    case 'repeat_prescription':
      return {
        type: 'repeat_prescription',
        data: {
          type: 'repeat_prescription',
          medications: parseArrayValue(collected?.medications_requested) || [],
          additional_notes: parseStringValue(collected?.prescription_notes) || '',
        },
      };

    case 'fit_note':
      return {
        type: 'fit_note',
        data: {
          type: 'fit_note',
          had_previous_note: parseBooleanValue(collected?.fit_note_previous) || false,
          illness_description: parseStringValue(collected?.fit_note_illness) || '',
          start_date: parseStringValue(collected?.fit_note_start_date) || '',
          end_date: parseStringValue(collected?.fit_note_end_date) || '',
          employer_accommodations: parseStringValue(collected?.fit_note_employer_help) || '',
        },
      };

    case 'routine_care':
      return {
        type: 'routine_care',
        data: {
          type: 'routine_care',
          care_type: parseStringValue(collected?.routine_care_type) || '',
          additional_details: parseStringValue(collected?.routine_care_details) || '',
        },
      };

    case 'test_results':
      return {
        type: 'test_results',
        data: {
          type: 'test_results',
          test_type: parseStringValue(collected?.test_type) || '',
          test_date: parseStringValue(collected?.test_date) || '',
          test_location: parseStringValue(collected?.test_location) || '',
          reason_for_test: parseStringValue(collected?.test_reason) || '',
        },
      };

    case 'referral_followup':
      return {
        type: 'referral_followup',
        data: {
          type: 'referral_followup',
          referral_for: parseStringValue(collected?.referral_for) || '',
          referral_date: parseStringValue(collected?.referral_date) || '',
          nhs_or_private: (parseStringValue(collected?.referral_nhs_or_private)?.toLowerCase() === 'private' ? 'private' : 'nhs') as 'nhs' | 'private',
          help_needed: parseStringValue(collected?.referral_help_needed) || '',
        },
      };

    case 'doctors_letter':
      return {
        type: 'doctors_letter',
        data: {
          type: 'doctors_letter',
          letter_purpose: parseStringValue(collected?.letter_purpose) || '',
          deadline: parseStringValue(collected?.letter_deadline) || '',
        },
      };

    case 'other_admin':
      return {
        type: 'other_admin',
        data: {
          type: 'other_admin',
          description: parseStringValue(collected?.other_admin_description) || '',
        },
      };

    default:
      // Unknown type - return null
      return { type: null, data: null };
  }
}

/**
 * Formats transcript entries into a readable string
 */
export function formatTranscript(
  transcript: ElevenLabsWebhookPayload['data']['transcript']
): string {
  if (!transcript || transcript.length === 0) {
    return '';
  }

  return transcript
    .map(entry => {
      const role = entry.role === 'agent' ? 'Agent' : 'Patient';
      const time = formatTime(entry.time_in_call_secs);
      return `[${time}] ${role}: ${entry.message}`;
    })
    .join('\n');
}

/**
 * Determines submission status based on analysis
 *
 * All new calls come in as 'requires_review' so staff must explicitly
 * review and mark them as completed. Only failed calls are marked 'failed'.
 */
export function determineStatus(
  analysis: ElevenLabsWebhookPayload['data']['analysis'],
  callStatus: 'done' | 'failed'
): 'completed' | 'failed' | 'requires_review' | 'pending' {
  if (callStatus === 'failed') {
    return 'failed';
  }

  // All new calls require staff review - they will mark as completed after handling
  return 'requires_review';
}

// ============================================
// Helper Functions
// ============================================

function formatPostcode(postcode: unknown): string {
  // Handle non-string inputs
  if (!postcode || typeof postcode !== 'string') {
    return '';
  }

  // Remove all spaces and convert to uppercase
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();

  // UK postcodes have the format: outward (2-4 chars) + inward (3 chars)
  // Add space before last 3 characters
  if (cleaned.length >= 5) {
    return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  }

  return cleaned;
}

function parsePreferredContact(value: unknown): PreferredContact {
  const stringValue = parseStringValue(value);
  if (!stringValue) return 'phone';

  const normalized = stringValue.toLowerCase();
  if (normalized === 'text' || normalized === 'sms') return 'text';
  if (normalized === 'both' || normalized === 'either') return 'both';
  return 'phone';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses a string value, handling "null" strings and objects from ElevenLabs
 */
function parseStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  // Handle objects - ElevenLabs sometimes sends { value: "...", description: "..." }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // Try common property names for the actual value
    const actualValue = obj.value ?? obj.result ?? obj.data;
    if (actualValue !== undefined) {
      return parseStringValue(actualValue);
    }
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // ElevenLabs sometimes returns "null" as a string
    if (trimmed.toLowerCase() === 'null' || trimmed === '') return null;
    return trimmed;
  }

  return String(value);
}

/**
 * Parses a boolean value, handling string "True"/"False" from ElevenLabs
 */
function parseBooleanValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  return Boolean(value);
}

/**
 * Parses an array value, handling "null" strings from ElevenLabs
 */
function parseArrayValue<T>(value: unknown): T[] | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'null' || trimmed === '') return null;
  }
  if (Array.isArray(value)) return value as T[];
  return null;
}
