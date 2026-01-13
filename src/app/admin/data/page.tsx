'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Submission } from '@/types';

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  getValue: (submission: Submission) => string;
}

const COLUMN_STORAGE_KEY = 'phoneagent_data_columns';

const ALL_COLUMNS: ColumnConfig[] = [
  { key: 'id', label: 'ID', visible: false, getValue: (s) => s.id.slice(0, 8) },
  { key: 'conversation_id', label: 'Conversation ID', visible: false, getValue: (s) => s.conversation_id.slice(0, 12) },
  { key: 'first_name', label: 'First Name', visible: true, getValue: (s) => s.patient_data?.first_name || '-' },
  { key: 'last_name', label: 'Last Name', visible: true, getValue: (s) => s.patient_data?.last_name || '-' },
  { key: 'phone', label: 'Phone', visible: true, getValue: (s) => s.patient_data?.phone_number || s.caller_phone || '-' },
  { key: 'postcode', label: 'Postcode', visible: true, getValue: (s) => s.patient_data?.postcode || '-' },
  { key: 'preferred_contact', label: 'Contact Pref', visible: false, getValue: (s) => s.patient_data?.preferred_contact || '-' },
  { key: 'emergency', label: 'Emergency', visible: true, getValue: (s) => s.patient_data?.emergency_confirmed === false ? 'POSSIBLE' : 'No' },
  { key: 'request_type', label: 'Request Type', visible: true, getValue: (s) => formatRequestType(s.request_type) },
  { key: 'status', label: 'Status', visible: true, getValue: (s) => s.status },
  { key: 'call_timestamp', label: 'Call Date', visible: true, getValue: (s) => formatDate(s.call_timestamp) },
  { key: 'call_duration', label: 'Duration', visible: false, getValue: (s) => s.call_duration_secs ? `${Math.floor(s.call_duration_secs / 60)}m ${s.call_duration_secs % 60}s` : '-' },
  { key: 'created_at', label: 'Created', visible: false, getValue: (s) => formatDate(s.created_at) },
  { key: 'updated_at', label: 'Updated', visible: false, getValue: (s) => formatDate(s.updated_at) },
  { key: 'edit_count', label: 'Edits', visible: false, getValue: (s) => String((s as any).edit_count || 0) },
];

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRequestType(type: string | null): string {
  if (!type) return '-';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DataPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnConfig[]>(ALL_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [sortKey, setSortKey] = useState<string>('call_timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load column preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (saved) {
      try {
        const savedVisibility = JSON.parse(saved) as Record<string, boolean>;
        setColumns(ALL_COLUMNS.map(col => ({
          ...col,
          visible: savedVisibility[col.key] ?? col.visible,
        })));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Save column preferences
  const saveColumnPreferences = (cols: ColumnConfig[]) => {
    const visibility: Record<string, boolean> = {};
    cols.forEach(col => {
      visibility[col.key] = col.visible;
    });
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibility));
  };

  // Fetch all submissions
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/submissions?limit=100');
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    const newColumns = columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    setColumns(newColumns);
    saveColumnPreferences(newColumns);
  };

  // Sort submissions
  const sortedSubmissions = useMemo(() => {
    const col = columns.find(c => c.key === sortKey);
    if (!col) return submissions;

    return [...submissions].sort((a, b) => {
      const aVal = col.getValue(a);
      const bVal = col.getValue(b);
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [submissions, sortKey, sortOrder, columns]);

  // Get visible columns
  const visibleColumns = columns.filter(col => col.visible);

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Raw Data View</h1>
                <p className="text-sm text-gray-500">{submissions.length} submissions</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Columns ({visibleColumns.length})
              </button>

              {showColumnPicker && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Toggle Columns</p>
                    {columns.map(col => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Table */}
      <main className="p-4">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumns.map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              {sortOrder === 'asc' ? (
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      {visibleColumns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {col.key === 'emergency' && col.getValue(submission) === 'POSSIBLE' ? (
                            <span className="text-red-600 font-medium">POSSIBLE</span>
                          ) : col.key === 'status' ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              submission.status === 'completed' ? 'bg-green-100 text-green-700' :
                              submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              submission.status === 'requires_review' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {submission.status}
                            </span>
                          ) : (
                            col.getValue(submission)
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        <Link
                          href={`/admin/${submission.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Click outside to close column picker */}
      {showColumnPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowColumnPicker(false)}
        />
      )}
    </div>
  );
}
