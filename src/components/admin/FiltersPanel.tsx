'use client';

import type { SubmissionStatus, RequestType } from '@/types';

export interface Filters {
  status: SubmissionStatus | 'all';
  type: RequestType | 'all';
  date: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  emergency: 'all' | 'yes' | 'no';
}

interface FiltersPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function FiltersPanel({ filters, onChange, onReset }: FiltersPanelProps) {
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.date !== 'all' ||
    filters.emergency !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as Filters['status'] })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="requires_review">Needs Review</option>
        <option value="failed">Failed</option>
      </select>

      {/* Type Filter */}
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value as Filters['type'] })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All Types</option>
        <option value="health_problem">Health Problem</option>
        <option value="repeat_prescription">Prescription</option>
      </select>

      {/* Date Filter */}
      <select
        value={filters.date}
        onChange={(e) => onChange({ ...filters, date: e.target.value as Filters['date'] })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>

      {/* Emergency Filter */}
      <select
        value={filters.emergency}
        onChange={(e) => onChange({ ...filters, emergency: e.target.value as Filters['emergency'] })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All Emergency Status</option>
        <option value="yes">Possible Emergency</option>
        <option value="no">No Emergency</option>
      </select>

      {/* Reset Button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
