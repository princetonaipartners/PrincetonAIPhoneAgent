import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { SubmissionStatus, RequestType } from '@/types';

/**
 * GET /api/admin/submissions
 *
 * Returns paginated, filtered submissions
 *
 * Query params:
 * - search: string (searches name, phone, postcode)
 * - status: SubmissionStatus | 'all'
 * - type: RequestType | 'all'
 * - date: 'today' | 'yesterday' | 'week' | 'month' | 'all'
 * - emergency: 'all' | 'yes' | 'no'
 * - attention: boolean (if true, returns only emergencies + requires_review)
 * - page: number (1-indexed)
 * - limit: number (default 20)
 * - sortBy: string (column name)
 * - sortOrder: 'asc' | 'desc'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const dateFilter = searchParams.get('date') || 'all';
    const emergency = searchParams.get('emergency') || 'all';
    const attention = searchParams.get('attention') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sort = searchParams.get('sortBy') || searchParams.get('sort') || 'created_at';
    const order = searchParams.get('sortOrder') === 'asc' ? true : false;

    const supabase = createAnonClient();

    // Build query
    let query = supabase
      .from('submissions')
      .select('*', { count: 'exact' });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status as SubmissionStatus);
    }

    // Apply type filter
    if (type !== 'all') {
      query = query.eq('request_type', type as RequestType);
    }

    // Apply date filter
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'today') {
      query = query.gte('created_at', todayStart.toISOString());
    } else if (dateFilter === 'yesterday') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      query = query
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString());
    } else if (dateFilter === 'week') {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      query = query.gte('created_at', weekStart.toISOString());
    } else if (dateFilter === 'month') {
      const monthStart = new Date(todayStart);
      monthStart.setMonth(monthStart.getMonth() - 1);
      query = query.gte('created_at', monthStart.toISOString());
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'call_timestamp', 'call_duration_secs', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    query = query.order(sortColumn, { ascending: order });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute query
    const { data: submissions, error, count } = await query;

    if (error) {
      console.error('[Submissions] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Apply client-side filters (search, emergency, attention)
    // These need to filter on JSON fields which Supabase doesn't handle well
    let filteredSubmissions = submissions || [];

    // Attention filter (emergencies + requires_review)
    if (attention) {
      filteredSubmissions = filteredSubmissions.filter(s => {
        const pd = s.patient_data as { emergency_confirmed?: boolean } | null;
        const isEmergency = pd?.emergency_confirmed === false;
        const needsReview = s.status === 'requires_review';
        return isEmergency || needsReview;
      });
    }

    // Search filter (name, phone, postcode)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSubmissions = filteredSubmissions.filter(s => {
        const pd = s.patient_data as {
          first_name?: string;
          last_name?: string;
          phone_number?: string;
          postcode?: string;
        } | null;

        if (!pd) return false;

        const firstName = (pd.first_name || '').toLowerCase();
        const lastName = (pd.last_name || '').toLowerCase();
        const phone = (pd.phone_number || '').toLowerCase();
        const postcode = (pd.postcode || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          phone.includes(searchLower) ||
          postcode.includes(searchLower) ||
          s.conversation_id.toLowerCase().includes(searchLower)
        );
      });
    }

    // Emergency filter
    if (emergency !== 'all') {
      filteredSubmissions = filteredSubmissions.filter(s => {
        const pd = s.patient_data as { emergency_confirmed?: boolean } | null;
        const isEmergency = pd?.emergency_confirmed === false;
        return emergency === 'yes' ? isEmergency : !isEmergency;
      });
    }

    // Calculate pagination info
    // Note: count from Supabase is before client-side filters
    // For accurate count with search/emergency/attention, we'd need a different approach
    const total = search || emergency !== 'all' || attention
      ? filteredSubmissions.length
      : (count || 0);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      submissions: filteredSubmissions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });

  } catch (error) {
    console.error('[Submissions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
