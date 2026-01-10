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
 * Extracts structured patient data from ElevenLabs analysis
 */
export function extractPatientData(
  analysis: ElevenLabsWebhookPayload['data']['analysis']
): PatientData {
  const data = analysis?.data_collected || {};

  return {
    first_name: data.patient_first_name || '',
    last_name: data.patient_last_name || '',
    postcode: formatPostcode(data.patient_postcode || ''),
    phone_number: data.patient_phone || '',
    preferred_contact: parsePreferredContact(data.preferred_contact),
    emergency_confirmed: data.emergency_confirmed ?? false,
  };
}

/**
 * Extracts request-specific data from ElevenLabs analysis
 */
export function extractRequestData(
  analysis: ElevenLabsWebhookPayload['data']['analysis']
): { type: RequestType | null; data: RequestData | null } {
  const collected = analysis?.data_collected;

  if (!collected?.request_type) {
    return { type: null, data: null };
  }

  const requestType = collected.request_type as RequestType;

  if (requestType === 'health_problem') {
    const healthData: HealthProblemRequest = {
      type: 'health_problem',
      description: collected.health_problem_description || '',
      duration: collected.health_problem_duration || '',
      progression: collected.health_problem_progression || '',
      treatments_tried: collected.health_problem_tried || '',
      concerns: collected.health_problem_concerns || '',
      help_requested: collected.health_problem_help_wanted || '',
      best_contact_times: collected.best_contact_times || '',
    };
    return { type: requestType, data: healthData };
  }

  if (requestType === 'repeat_prescription') {
    const prescriptionData: RepeatPrescriptionRequest = {
      type: 'repeat_prescription',
      medications: collected.medications_requested || [],
      additional_notes: collected.prescription_notes || '',
    };
    return { type: requestType, data: prescriptionData };
  }

  return { type: null, data: null };
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
 */
export function determineStatus(
  analysis: ElevenLabsWebhookPayload['data']['analysis'],
  callStatus: 'done' | 'failed'
): 'completed' | 'failed' | 'requires_review' {
  if (callStatus === 'failed') {
    return 'failed';
  }

  if (!analysis?.call_successful) {
    return 'requires_review';
  }

  const data = analysis.data_collected;

  // Check if essential fields are present
  if (!data.patient_first_name || !data.patient_last_name) {
    return 'requires_review';
  }

  if (!data.emergency_confirmed) {
    return 'requires_review';
  }

  return 'completed';
}

// ============================================
// Helper Functions
// ============================================

function formatPostcode(postcode: string): string {
  // Remove all spaces and convert to uppercase
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();

  // UK postcodes have the format: outward (2-4 chars) + inward (3 chars)
  // Add space before last 3 characters
  if (cleaned.length >= 5) {
    return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  }

  return cleaned;
}

function parsePreferredContact(value: string | undefined): PreferredContact {
  if (!value) return 'phone';

  const normalized = value.toLowerCase();
  if (normalized === 'text' || normalized === 'sms') return 'text';
  if (normalized === 'both' || normalized === 'either') return 'both';
  return 'phone';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
