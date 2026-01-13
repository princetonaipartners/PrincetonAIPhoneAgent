'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardStats } from './DashboardStats';
import { AttentionPanel } from './AttentionPanel';
import { SearchBar } from './SearchBar';
import { FiltersPanel, type Filters } from './FiltersPanel';
import { SubmissionsTable } from './SubmissionsTable';
import { Pagination } from './Pagination';
import type { Submission } from '@/types';

interface StatsData {
  today: {
    total: number;
    completed: number;
    pending: number;
    requires_review: number;
    failed: number;
  };
  week: {
    total: number;
  };
  emergencies: number;
}

interface SubmissionsResponse {
  submissions: Submission[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const DEFAULT_FILTERS: Filters = {
  status: 'all',
  type: 'all',
  date: 'all',
  emergency: 'all',
};

const ITEMS_PER_PAGE = 20;

export function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [attentionItems, setAttentionItems] = useState<Submission[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  // Get initial values from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState<Filters>({
    status: (searchParams.get('status') as Filters['status']) || 'all',
    type: (searchParams.get('type') as Filters['type']) || 'all',
    date: (searchParams.get('date') as Filters['date']) || 'all',
    emergency: (searchParams.get('emergency') as Filters['emergency']) || 'all',
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );
  const [activeStatFilter, setActiveStatFilter] = useState<string | undefined>();

  // Update URL with current state
  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams();

      const allParams = {
        search,
        status: filters.status !== 'all' ? filters.status : undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        date: filters.date !== 'all' ? filters.date : undefined,
        emergency: filters.emergency !== 'all' ? filters.emergency : undefined,
        sortBy: sortBy !== 'created_at' ? sortBy : undefined,
        sortOrder: sortOrder !== 'desc' ? sortOrder : undefined,
        page: currentPage > 1 ? String(currentPage) : undefined,
        ...params,
      };

      Object.entries(allParams).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        }
      });

      const queryString = newParams.toString();
      router.push(`/admin${queryString ? `?${queryString}` : ''}`, { scroll: false });
    },
    [search, filters, sortBy, sortOrder, currentPage, router]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch attention items (emergencies + requires_review)
  const fetchAttentionItems = useCallback(async () => {
    try {
      setAttentionLoading(true);
      const res = await fetch('/api/admin/submissions?attention=true&limit=10');
      if (res.ok) {
        const data: SubmissionsResponse = await res.json();
        setAttentionItems(data.submissions);
      }
    } catch (error) {
      console.error('Failed to fetch attention items:', error);
    } finally {
      setAttentionLoading(false);
    }
  }, []);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      setSubmissionsLoading(true);

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.date !== 'all') params.set('date', filters.date);
      if (filters.emergency !== 'all') params.set('emergency', filters.emergency);
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      if (res.ok) {
        const data: SubmissionsResponse = await res.json();
        setSubmissions(data.submissions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [search, filters, currentPage, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchAttentionItems();
  }, [fetchStats, fetchAttentionItems]);

  // Fetch submissions when filters change
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handlers
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
    updateUrl({ search: value || undefined, page: undefined });
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setActiveStatFilter(undefined);
    updateUrl({
      status: newFilters.status !== 'all' ? newFilters.status : undefined,
      type: newFilters.type !== 'all' ? newFilters.type : undefined,
      date: newFilters.date !== 'all' ? newFilters.date : undefined,
      emergency: newFilters.emergency !== 'all' ? newFilters.emergency : undefined,
      page: undefined,
    });
  };

  const handleFiltersReset = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    setActiveStatFilter(undefined);
    updateUrl({
      status: undefined,
      type: undefined,
      date: undefined,
      emergency: undefined,
      page: undefined,
    });
  };

  const handleStatClick = (filter: { status?: string; emergency?: string; date?: string }) => {
    const newFilters = { ...DEFAULT_FILTERS };

    if (filter.status) {
      newFilters.status = filter.status as Filters['status'];
      setActiveStatFilter(filter.status);
    } else if (filter.emergency) {
      newFilters.emergency = filter.emergency as Filters['emergency'];
      setActiveStatFilter('emergency');
    } else if (filter.date) {
      newFilters.date = filter.date as Filters['date'];
      setActiveStatFilter(filter.date);
    }

    setFilters(newFilters);
    setCurrentPage(1);
    updateUrl({
      status: newFilters.status !== 'all' ? newFilters.status : undefined,
      type: undefined,
      date: newFilters.date !== 'all' ? newFilters.date : undefined,
      emergency: newFilters.emergency !== 'all' ? newFilters.emergency : undefined,
      page: undefined,
    });
  };

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(column);
    setSortOrder(newOrder);
    updateUrl({
      sortBy: column !== 'created_at' ? column : undefined,
      sortOrder: newOrder !== 'desc' ? newOrder : undefined,
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrl({ page: page > 1 ? String(page) : undefined });
  };

  const handleRefresh = () => {
    fetchStats();
    fetchAttentionItems();
    fetchSubmissions();
  };

  const handleViewAllAttention = () => {
    setFilters({ ...DEFAULT_FILTERS, emergency: 'yes' });
    setActiveStatFilter('emergency');
    updateUrl({
      status: undefined,
      type: undefined,
      date: undefined,
      emergency: 'yes',
      page: undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PrincetonAI Phone Agent</h1>
              <p className="text-sm text-gray-500 mt-1">Staff Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-full sm:w-80">
                <SearchBar
                  value={search}
                  onChange={handleSearchChange}
                  isSearching={submissionsLoading && search.length > 0}
                />
              </div>
              <Link
                href="/admin/data"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="View Raw Data"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="hidden sm:inline">Data</span>
              </Link>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <DashboardStats
          stats={stats}
          isLoading={statsLoading}
          onStatClick={handleStatClick}
          activeFilter={activeStatFilter}
        />

        {/* Attention Panel */}
        <AttentionPanel
          items={attentionItems}
          isLoading={attentionLoading}
          onViewAll={handleViewAllAttention}
        />

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <FiltersPanel
            filters={filters}
            onChange={handleFiltersChange}
            onReset={handleFiltersReset}
          />
        </div>

        {/* Submissions Table */}
        <SubmissionsTable
          submissions={submissions}
          isLoading={submissionsLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {/* Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  );
}
