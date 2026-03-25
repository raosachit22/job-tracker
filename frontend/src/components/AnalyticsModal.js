import { X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const STATUS_COLORS = {
  Applied: '#3B82F6',
  Interviewing: '#E5FE40',
  Offered: '#10B981',
  Rejected: '#EF4444',
  Pending: '#6B7280',
  Ghosted: '#9CA3AF',
};

const PRIORITY_COLORS = {
  High: '#EF4444',
  Medium: '#E5FE40',
  Low: '#6B7280',
};

export default function AnalyticsModal({ stats, onClose }) {
  const statusData = Object.entries(stats.by_status || {}).map(([name, value]) => ({
    name,
    value,
    fill: STATUS_COLORS[name] || '#6B7280',
  }));

  const priorityData = Object.entries(stats.by_priority || {}).map(([name, value]) => ({
    name,
    value,
    fill: PRIORITY_COLORS[name] || '#6B7280',
  }));

  const monthlyData = (stats.monthly || []).map((item) => ({
    month: item.month,
    count: item.count,
  }));

  // Calculate conversion rates
  const totalApps = stats.total || 0;
  const interviews = stats.by_status?.Interviewing || 0;
  const offers = stats.by_status?.Offered || 0;
  const rejected = stats.by_status?.Rejected || 0;

  const interviewRate = totalApps > 0 ? ((interviews + offers) / totalApps * 100).toFixed(1) : 0;
  const offerRate = totalApps > 0 ? (offers / totalApps * 100).toFixed(1) : 0;
  const rejectionRate = totalApps > 0 ? (rejected / totalApps * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-[#141414] border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: '2px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="font-heading text-xl font-bold">Analytics Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" data-testid="close-analytics-modal">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-white/10 p-4" style={{ borderRadius: '2px' }}>
              <div className="text-3xl font-mono font-bold text-white">{totalApps}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-1">Total Applications</div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 p-4" style={{ borderRadius: '2px' }}>
              <div className="text-3xl font-mono font-bold text-[#E5FE40]">{interviewRate}%</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-1">Interview Rate</div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 p-4" style={{ borderRadius: '2px' }}>
              <div className="text-3xl font-mono font-bold text-emerald-400">{offerRate}%</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-1">Offer Rate</div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 p-4" style={{ borderRadius: '2px' }}>
              <div className="text-3xl font-mono font-bold text-red-400">{rejectionRate}%</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-1">Rejection Rate</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-[#0A0A0A] border border-white/10 p-6" style={{ borderRadius: '2px' }}>
              <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 font-bold mb-4">Status Distribution</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#141414', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '2px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500">No data</div>
              )}
            </div>

            {/* Priority Distribution */}
            <div className="bg-[#0A0A0A] border border-white/10 p-6" style={{ borderRadius: '2px' }}>
              <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 font-bold mb-4">Priority Distribution</h3>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={priorityData}>
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#141414', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '2px'
                      }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500">No data</div>
              )}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-[#0A0A0A] border border-white/10 p-6" style={{ borderRadius: '2px' }}>
            <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 font-bold mb-4">Monthly Applications</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#141414', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '2px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#E5FE40" 
                    strokeWidth={2}
                    dot={{ fill: '#E5FE40', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500">No data</div>
            )}
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap gap-4 justify-center">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-3 h-3" style={{ backgroundColor: color, borderRadius: '2px' }} />
                <span className="text-xs text-gray-400">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
