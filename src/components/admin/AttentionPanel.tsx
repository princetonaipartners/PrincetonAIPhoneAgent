'use client';

import Link from 'next/link';
import type { Submission } from '@/types';

interface AttentionPanelProps {
  items: Submission[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  }
}

function AttentionItem({ submission }: { submission: Submission }) {
  const isEmergency = submission.patient_data?.emergency_confirmed === false;
  const needsReview = submission.status === 'requires_review';

  const firstName = submission.patient_data?.first_name || '';
  const lastName = submission.patient_data?.last_name || '';
  const hasName = firstName || lastName;
  const displayName = hasName ? `${firstName} ${lastName}`.trim() : 'Unknown Patient';

  return (
    <Link
      href={`/admin/${submission.id}`}
      className={`block p-3 rounded-lg border transition-all hover:shadow-md ${
        isEmergency
          ? 'bg-red-50 border-red-200 hover:bg-red-100'
          : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isEmergency ? 'bg-red-500' : 'bg-orange-500'
        } text-white text-sm`}>
          {isEmergency ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isEmergency ? 'text-red-900' : 'text-orange-900'}`}>
              {displayName}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              isEmergency
                ? 'bg-red-200 text-red-800'
                : 'bg-orange-200 text-orange-800'
            }`}>
              {isEmergency ? 'Possible Emergency' : 'Review Needed'}
            </span>
          </div>
          <div className={`text-xs ${isEmergency ? 'text-red-600' : 'text-orange-600'}`}>
            {formatTimeAgo(submission.call_timestamp)}
          </div>
        </div>
        <svg
          className={`w-5 h-5 ${isEmergency ? 'text-red-400' : 'text-orange-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttentionPanel({ items, isLoading, onViewAll }: AttentionPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Needs Attention</h2>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Needs Attention</h2>
        </div>
        <div className="text-center py-6">
          <div className="text-green-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">All caught up! No urgent items.</p>
        </div>
      </div>
    );
  }

  const displayItems = items.slice(0, 5);
  const hasMore = items.length > 5;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Needs Attention
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            {items.length}
          </span>
        </h2>
        {hasMore && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </button>
        )}
      </div>
      <div className="space-y-3">
        {displayItems.map((item) => (
          <AttentionItem key={item.id} submission={item} />
        ))}
      </div>
    </div>
  );
}
