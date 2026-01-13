import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/stats
 *
 * Returns dashboard statistics
 */
export async function GET() {
  try {
    const supabase = createAnonClient();

    // Get current date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Fetch all submissions for calculations
    const { data: allSubmissions, error } = await supabase
      .from('submissions')
      .select('id, status, patient_data, call_timestamp, created_at')
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Stats] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    const submissions = allSubmissions || [];

    // Calculate today's stats
    const todaySubmissions = submissions.filter(s =>
      new Date(s.created_at) >= todayStart
    );

    const today = {
      total: todaySubmissions.length,
      completed: todaySubmissions.filter(s => s.status === 'completed').length,
      pending: todaySubmissions.filter(s => s.status === 'pending').length,
      requires_review: todaySubmissions.filter(s => s.status === 'requires_review').length,
      failed: todaySubmissions.filter(s => s.status === 'failed').length,
    };

    // Calculate week stats
    const week = {
      total: submissions.length,
    };

    // Count possible emergencies (emergency_confirmed = false)
    const emergencies = submissions.filter(s => {
      const patientData = s.patient_data as { emergency_confirmed?: boolean } | null;
      return patientData && patientData.emergency_confirmed === false;
    }).length;

    return NextResponse.json({
      today,
      week,
      emergencies,
    });

  } catch (error) {
    console.error('[Stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
