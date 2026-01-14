import { createHmac, timingSafeEqual } from 'crypto';
import type {
  ElevenLabsWebhookPayload,
  ElevenLabsDataCollected,
  PatientData,
  RequestData,
  MultiRequestData,
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

  // IMPORTANT: Only include phrases where the patient is ASSERTING an emergency.
  // DO NOT include symptom phrases (chest pain, difficulty breathing, etc.) because
  // patients often DENY these during emergency screening:
  //   Agent: "If you have chest pain, difficulty breathing..."
  //   Patient: "No, no chest pain, I'm fine"
  // The word "chest pain" appears but the patient is NEGATING it.
  const emergencyPhrases = [
    // Direct emergency statements (patient asserting emergency)
    'this is an emergency',
    'it is an emergency',
    'is an emergency',
    'i have an emergency',
    'having an emergency',
    'yes emergency',
    'emergency help',

    // Requesting immediate help
    'need ambulance',
    'call 999',
    'call an ambulance',
    'need an ambulance',

    // Life-threatening statements (patient asserting)
    'i am dying',
    'i\'m dying',
    'im dying',
    'going to die',
    'about to die',
    'having a heart attack',
    'having a stroke',
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
 * Parses comma-separated request types from ElevenLabs
 * e.g., "fit_note,repeat_prescription,health_problem" -> ['fit_note', 'repeat_prescription', 'health_problem']
 */
export function parseRequestTypes(value: string | null): RequestType[] {
  if (!value) return [];

  const validTypes: RequestType[] = [
    'health_problem', 'repeat_prescription', 'fit_note',
    'routine_care', 'test_results', 'referral_followup',
    'doctors_letter', 'other_admin'
  ];

  const types = value
    .toLowerCase()
    .split(',')
    .map(t => t.trim().replace(/[\s-]/g, '_'))
    .filter(t => validTypes.includes(t as RequestType)) as RequestType[];

  // Remove duplicates
  return [...new Set(types)];
}

/**
 * Extracts data for a single request type
 */
function extractSingleRequestData(
  requestType: RequestType,
  collected: ElevenLabsDataCollected | undefined
): RequestData | null {
  switch (requestType) {
    case 'health_problem':
      return {
        type: 'health_problem',
        description: parseStringValue(collected?.health_problem_description) || '',
        duration: parseStringValue(collected?.health_problem_duration) || '',
        progression: parseStringValue(collected?.health_problem_progression) || '',
        treatments_tried: parseStringValue(collected?.health_problem_tried) || '',
        concerns: parseStringValue(collected?.health_problem_concerns) || '',
        help_requested: parseStringValue(collected?.health_problem_help_wanted) || '',
        best_contact_times: parseStringValue(collected?.best_contact_times) || '',
      };

    case 'repeat_prescription':
      return {
        type: 'repeat_prescription',
        medications: parseMedicationsString(collected?.medications_requested),
        additional_notes: parseStringValue(collected?.prescription_notes) || '',
      };

    case 'fit_note':
      return {
        type: 'fit_note',
        had_previous_note: parseBooleanValue(collected?.fit_note_previous) || false,
        illness_description: parseStringValue(collected?.fit_note_illness) || '',
        start_date: '',
        end_date: '',
        employer_accommodations: parseStringValue(collected?.fit_note_dates_and_details) || '',
      };

    case 'routine_care':
      return {
        type: 'routine_care',
        care_type: '',
        additional_details: parseStringValue(collected?.routine_care_details) || '',
      };

    case 'test_results':
      return {
        type: 'test_results',
        test_type: parseStringValue(collected?.test_details) || '',
        test_date: '',
        test_location: '',
        reason_for_test: '',
      };

    case 'referral_followup':
      return {
        type: 'referral_followup',
        referral_for: parseStringValue(collected?.referral_details) || '',
        referral_date: '',
        nhs_or_private: 'nhs' as 'nhs' | 'private',
        help_needed: '',
      };

    case 'doctors_letter':
      return {
        type: 'doctors_letter',
        letter_purpose: parseStringValue(collected?.letter_details) || '',
        deadline: '',
      };

    case 'other_admin':
      return {
        type: 'other_admin',
        description: parseStringValue(collected?.other_admin_description) || '',
      };

    default:
      return null;
  }
}

/**
 * Extracts request-specific data from ElevenLabs analysis
 * Supports multiple request types in a single call (comma-separated)
 * Returns: { types: ['fit_note', 'repeat_prescription'], data: { fit_note: {...}, repeat_prescription: {...} } }
 *
 * FALLBACK DETECTION: If ElevenLabs doesn't capture request_type correctly,
 * we detect types based on what data was actually collected.
 */
export function extractRequestData(
  analysis: ElevenLabsWebhookPayload['data']['analysis']
): { types: RequestType[]; data: MultiRequestData | null } {
  const collected = analysis?.data_collection_results;

  // Parse request_type from ElevenLabs
  const requestTypeValue = parseStringValue(collected?.request_type);
  let types = parseRequestTypes(requestTypeValue);

  // Fallback: detect types from collected data if ElevenLabs missed any
  const detectedTypes = detectRequestTypesFromData(collected);
  for (const detected of detectedTypes) {
    if (!types.includes(detected)) {
      types.push(detected);
    }
  }

  if (types.length === 0) {
    return { types: [], data: null };
  }

  // Extract data for each request type
  const data: MultiRequestData = {};
  for (const requestType of types) {
    const requestData = extractSingleRequestData(requestType, collected);
    if (requestData) {
      data[requestType] = requestData;
    }
  }

  // Return null if no data was extracted
  if (Object.keys(data).length === 0) {
    return { types, data: null };
  }

  return { types, data };
}

/**
 * Detects request types based on what data was actually collected
 * This is a CONSERVATIVE fallback - only for core 3 types that are commonly requested.
 *
 * IMPORTANT: ElevenLabs fills many fields with garbage data from the conversation
 * even when the patient didn't request those services. We ONLY use fallback detection
 * for: health_problem, repeat_prescription, fit_note.
 *
 * For other types (routine_care, test_results, referral_followup, doctors_letter, other_admin),
 * we trust ElevenLabs request_type field - they're rare and the fallback creates false positives.
 */
function detectRequestTypesFromData(collected: ElevenLabsDataCollected | undefined): RequestType[] {
  if (!collected) return [];

  const detected: RequestType[] = [];

  // Health problem: has description or concerns
  const healthDesc = parseStringValue(collected.health_problem_description);
  const healthConcerns = parseStringValue(collected.health_problem_concerns);
  if (healthDesc || healthConcerns) {
    detected.push('health_problem');
  }

  // Repeat prescription: has medications_requested
  const medications = parseStringValue(collected.medications_requested);
  if (medications) {
    detected.push('repeat_prescription');
  }

  // Fit note: has fit_note_illness
  // BUT avoid false positives when ElevenLabs incorrectly captures health problem as fit_note_illness
  const fitIllness = parseStringValue(collected.fit_note_illness);
  if (fitIllness && !isEmergencyConfirmationResponse(fitIllness)) {
    // Only count as fit_note if it's different from the health problem description
    // ElevenLabs sometimes incorrectly captures the health problem in fit_note_illness
    const isDifferentFromHealthProblem = !healthDesc ||
      fitIllness.toLowerCase().trim() !== healthDesc.toLowerCase().trim();

    // Also check for fit_note_dates_and_details or fit_note_previous to confirm it's a real fit note request
    const hasFitNoteDates = parseStringValue(collected.fit_note_dates_and_details);
    const hasFitNotePrevious = collected.fit_note_previous !== undefined && collected.fit_note_previous !== null;

    if (isDifferentFromHealthProblem || hasFitNoteDates || hasFitNotePrevious) {
      detected.push('fit_note');
    }
  }

  // NOTE: We do NOT detect the following types via fallback because ElevenLabs
  // fills these fields with garbage data from the conversation:
  // - routine_care (routine_care_details often contains generic text)
  // - test_results (test_details gets filled with health problem info)
  // - referral_followup (referral_details gets filled with garbage)
  // - doctors_letter (letter_details gets filled with contact time info)
  // - other_admin (other_admin_description gets filled with contact time info)
  //
  // For these types, we rely on ElevenLabs request_type field to be accurate.

  return detected;
}

/**
 * Checks if a value looks like an emergency confirmation response
 * These get incorrectly captured in fit_note_illness sometimes
 */
function isEmergencyConfirmationResponse(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  const emergencyResponses = ['no', "i'm good", 'im good', 'fine', "i'm fine", 'im fine', 'nope', 'not an emergency'];
  return emergencyResponses.includes(normalized);
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
 * Parses a boolean value, handling string "True"/"False" and object wrapper from ElevenLabs
 * ElevenLabs often sends { value: "True", rationale: "..." } format
 */
function parseBooleanValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;

  // Handle objects - ElevenLabs sends { value: "True/False", rationale: "..." }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const actualValue = obj.value ?? obj.result ?? obj.data;
    // Recursively parse the extracted value
    return parseBooleanValue(actualValue);
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    // Handle "null" string as false
    if (lower === 'null' || lower === '') return false;
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

/**
 * Parses a medications string from ElevenLabs into structured Medication objects
 * Input formats:
 *   - "Adderall XR 25 MG, Codine 50 MG"
 *   - "Metformin 500mg, Lisinopril 10mg"
 *   - { value: "Adderall XR 25 MG, Codine 50 MG" }
 *
 * Returns array of { name, strength } objects
 */
function parseMedicationsString(value: unknown): { name: string; strength: string }[] {
  // First extract the string value (handles object wrapper from ElevenLabs)
  const stringValue = parseStringValue(value);
  if (!stringValue) return [];

  // Split by comma and process each medication
  const medications: { name: string; strength: string }[] = [];
  const items = stringValue.split(',').map(s => s.trim()).filter(s => s.length > 0);

  for (const item of items) {
    // Try to extract strength - look for number followed by unit (MG, mg, ML, ml, mcg, etc.)
    // Pattern: captures everything before the number as name, number+unit as strength
    const strengthMatch = item.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*(?:mg|MG|ml|ML|mcg|MCG|g|G|IU|iu|%|units?)?)\s*$/i);

    if (strengthMatch) {
      medications.push({
        name: strengthMatch[1].trim(),
        strength: strengthMatch[2].trim().toUpperCase(),
      });
    } else {
      // No clear strength pattern found - put entire item as name
      medications.push({
        name: item,
        strength: '',
      });
    }
  }

  return medications;
}
