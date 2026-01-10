import type { PostcodeValidationResult } from '@/types';

/**
 * UK Postcode validation regex
 *
 * Matches formats like:
 * - SW1A 1AA
 * - M1 1AA
 * - B33 8TH
 * - CR2 6XH
 * - DN55 1PT
 */
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})$/i;

/**
 * Validates and formats a UK postcode
 */
export function validatePostcode(postcode: string): PostcodeValidationResult {
  if (!postcode || typeof postcode !== 'string') {
    return {
      valid: false,
      formatted: '',
      error: 'Postcode is required',
    };
  }

  // Clean the input
  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, '');

  if (cleaned.length < 5 || cleaned.length > 7) {
    return {
      valid: false,
      formatted: '',
      error: 'Invalid postcode length',
    };
  }

  // Format: add space before last 3 characters
  const formatted = `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;

  // Validate against regex
  if (!UK_POSTCODE_REGEX.test(formatted)) {
    return {
      valid: false,
      formatted: '',
      error: 'Invalid UK postcode format',
    };
  }

  return {
    valid: true,
    formatted,
  };
}

/**
 * Formats a postcode for display (adds space if missing)
 */
export function formatPostcode(postcode: string): string {
  const result = validatePostcode(postcode);
  return result.valid ? result.formatted : postcode.toUpperCase();
}
