import { NextRequest, NextResponse } from 'next/server';
import { validatePostcode } from '@/lib/utils/postcode';

/**
 * POST /api/tools/validate-postcode
 *
 * Real-time postcode validation tool for ElevenLabs agent
 * Can be called during conversation to validate patient postcode
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postcode } = body;

    if (!postcode) {
      return NextResponse.json(
        { valid: false, formatted: '', error: 'Postcode is required' },
        { status: 400 }
      );
    }

    const result = validatePostcode(postcode);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Postcode Validation] Error:', error);

    return NextResponse.json(
      { valid: false, formatted: '', error: 'Validation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tools/validate-postcode
 *
 * Validate postcode via query parameter (for testing)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postcode = searchParams.get('postcode');

  if (!postcode) {
    return NextResponse.json(
      { valid: false, formatted: '', error: 'Postcode query parameter required' },
      { status: 400 }
    );
  }

  const result = validatePostcode(postcode);

  return NextResponse.json(result);
}
