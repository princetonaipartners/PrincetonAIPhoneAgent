'use client';

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

interface DashboardStatsProps {
  stats: StatsData | null;
  isLoading: boolean;
  onStatClick: (filter: { status?: string; emergency?: string; date?: string }) => void;
  activeFilter?: string;
}

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'orange' | 'red' | 'green' | 'gray';
  onClick: () => void;
  isActive?: boolean;
  isLoading?: boolean;
}

function StatCard({ label, value, color, onClick, isActive, isLoading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const activeRing = isActive ? 'ring-2 ring-offset-2 ring-blue-500' : '';

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border ${colorClasses[color]} ${activeRing} hover:shadow-md transition-all text-left w-full`}
    >
      <div className="text-sm font-medium opacity-75">{label}</div>
      <div className="text-2xl font-bold mt-1">
        {isLoading ? (
          <div className="h-8 w-12 bg-current opacity-20 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>
    </button>
  );
}

export function DashboardStats({ stats, isLoading, onStatClick, activeFilter }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard
        label="Today"
        value={stats?.today.total || 0}
        color="blue"
        onClick={() => onStatClick({ date: 'today' })}
        isActive={activeFilter === 'today'}
        isLoading={isLoading}
      />
      <StatCard
        label="Pending"
        value={stats?.today.pending || 0}
        color="yellow"
        onClick={() => onStatClick({ status: 'pending' })}
        isActive={activeFilter === 'pending'}
        isLoading={isLoading}
      />
      <StatCard
        label="Needs Review"
        value={stats?.today.requires_review || 0}
        color="orange"
        onClick={() => onStatClick({ status: 'requires_review' })}
        isActive={activeFilter === 'requires_review'}
        isLoading={isLoading}
      />
      <StatCard
        label="Emergencies"
        value={stats?.emergencies || 0}
        color="red"
        onClick={() => onStatClick({ emergency: 'yes' })}
        isActive={activeFilter === 'emergency'}
        isLoading={isLoading}
      />
      <StatCard
        label="This Week"
        value={stats?.week.total || 0}
        color="gray"
        onClick={() => onStatClick({ date: 'week' })}
        isActive={activeFilter === 'week'}
        isLoading={isLoading}
      />
    </div>
  );
}
