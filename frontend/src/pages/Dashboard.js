import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Toaster, toast } from 'sonner';
import { 
  Briefcase, Search, Plus, Download, Upload,
  BarChart3, Settings, Trash2, Edit, ExternalLink,
  Mail, Phone, Linkedin
} from 'lucide-react';
import JobModal from '../components/JobModal';
import ColumnModal from '../components/ColumnModal';
import AnalyticsModal from '../components/AnalyticsModal';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  Applied: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-400' },
  Interviewing: { bg: 'bg-[#E5FE40]/10', border: 'border-[#E5FE40]', text: 'text-[#E5FE40]' },
  Offered: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-400' },
  Rejected: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-400' },
  Pending: { bg: 'bg-gray-500/10', border: 'border-gray-500', text: 'text-gray-400' },
  Ghosted: { bg: 'bg-gray-500/10', border: 'border-gray-500', text: 'text-gray-400' },
};

const PRIORITY_COLORS = {
  High: 'bg-red-500',
  Medium: 'bg-[#E5FE40]',
  Low: 'bg-gray-500',
};

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [columns, setColumns] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {}, by_priority: {}, monthly: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [jobModal, setJobModal] = useState({ open: false, job: null });
  const [columnModal, setColumnModal] = useState(false);
  const [analyticsModal, setAnalyticsModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, columnsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/jobs`),
        axios.get(`${API}/api/columns`),
        axios.get(`${API}/api/stats`),
      ]);
      setJobs(jobsRes.data);
      setColumns(columnsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      const { data } = await axios.get(`${API}/api/jobs/export/all`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-tracker-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result);
        if (!Array.isArray(data.jobs)) throw new Error('Invalid format');
        await axios.post(`${API}/api/jobs/import`, data);
        toast.success(`Imported ${data.jobs.length} jobs`);
        fetchData();
      } catch (err) {
        toast.error('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    try {
      await axios.delete(`${API}/api/jobs/${id}`);
      toast.success('Job deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchSearch = 
      job.company?.toLowerCase().includes(search.toLowerCase()) ||
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.role?.toLowerCase().includes(search.toLowerCase()) ||
      job.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || job.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-gray-400 font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E5FE40] flex items-center justify-center" style={{ borderRadius: '2px' }}>
              <Briefcase className="w-4 h-4 text-[#0A0A0A]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight">Job Tracker</h1>
              <p className="text-xs text-gray-500 font-mono">TRACK YOUR CAREER</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnalyticsModal(true)}
              className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
              style={{ borderRadius: '2px' }}
              data-testid="analytics-btn"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              Analytics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColumnModal(true)}
              className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
              style={{ borderRadius: '2px' }}
              data-testid="columns-btn"
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
              Columns
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
              style={{ borderRadius: '2px' }}
              data-testid="export-btn"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              Export
            </Button>
            <label>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10 gap-2 cursor-pointer"
                style={{ borderRadius: '2px' }}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4" strokeWidth={1.5} />
                  Import
                </span>
              </Button>
              <input type="file" className="hidden" accept=".json" onChange={handleImport} data-testid="import-input" />
            </label>
            <Button
              onClick={() => setJobModal({ open: true, job: null })}
              className="bg-[#E5FE40] text-[#0A0A0A] hover:bg-[#D4ED31] font-bold gap-2"
              style={{ borderRadius: '2px' }}
              data-testid="add-job-btn"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add Job
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-white/10 overflow-x-auto">
        <div className="flex min-w-max">
          <div className="stats-item">
            <span className="font-mono text-2xl font-bold">{stats.total}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Total</span>
          </div>
          {Object.entries(stats.by_status || {}).map(([status, count]) => (
            <div key={status} className="stats-item">
              <div 
                className="w-2 h-2" 
                style={{ 
                  borderRadius: '50%', 
                  backgroundColor: STATUS_COLORS[status]?.text?.replace('text-', '').includes('E5FE40') 
                    ? '#E5FE40' 
                    : status === 'Applied' ? '#3B82F6' 
                    : status === 'Offered' ? '#10B981'
                    : status === 'Rejected' ? '#EF4444'
                    : '#6B7280'
                }} 
              />
              <div>
                <div className="font-mono text-xl font-bold">{count}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" strokeWidth={1.5} />
            <Input
              placeholder="Search company, role, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-transparent border-white/20 focus:border-[#E5FE40] h-10"
              style={{ borderRadius: '2px' }}
              data-testid="search-input"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-transparent border-white/20" style={{ borderRadius: '2px' }} data-testid="status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="Interviewing">Interviewing</SelectItem>
              <SelectItem value="Offered">Offered</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Ghosted">Ghosted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px] bg-transparent border-white/20" style={{ borderRadius: '2px' }} data-testid="priority-filter">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-6 pb-6">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-6 empty-state-bg opacity-50" />
            <h3 className="font-heading text-lg text-gray-300 mb-2">No applications yet</h3>
            <p className="text-gray-500 text-sm mb-6">Click "Add Job" to start tracking your job search</p>
            <Button
              onClick={() => setJobModal({ open: true, job: null })}
              className="bg-[#E5FE40] text-[#0A0A0A] hover:bg-[#D4ED31] font-bold gap-2"
              style={{ borderRadius: '2px' }}
              data-testid="empty-add-job-btn"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add Your First Job
            </Button>
          </div>
        ) : (
          <table className="w-full mt-4 min-w-[1000px]">
            <thead>
              <tr>
                <th className="table-header w-8"></th>
                <th className="table-header">Company</th>
                <th className="table-header">Role / Title</th>
                <th className="table-header">Status</th>
                <th className="table-header">Applied</th>
                <th className="table-header">Link</th>
                <th className="table-header">Contacts</th>
                {columns.map((col) => (
                  <th key={col.id} className="table-header">{col.name}</th>
                ))}
                <th className="table-header">Notes</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id} className="table-row hover:bg-white/[0.02] transition-colors" data-testid={`job-row-${job.id}`}>
                  <td className="table-cell">
                    <div 
                      className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.Medium}`}
                      title={`Priority: ${job.priority || 'Medium'}`}
                    />
                  </td>
                  <td className="table-cell font-medium text-white">{job.company}</td>
                  <td className="table-cell">
                    <div className="text-white font-medium">{job.title}</div>
                    {job.role && <div className="text-gray-500 text-xs font-mono mt-1">{job.role}</div>}
                  </td>
                  <td className="table-cell">
                    <span 
                      className={`inline-flex items-center px-2 py-1 text-xs uppercase tracking-widest border ${
                        STATUS_COLORS[job.status]?.bg || STATUS_COLORS.Pending.bg
                      } ${STATUS_COLORS[job.status]?.border || STATUS_COLORS.Pending.border} ${
                        STATUS_COLORS[job.status]?.text || STATUS_COLORS.Pending.text
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
                      {job.status || 'Pending'}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs text-gray-400">{job.date || '-'}</td>
                  <td className="table-cell">
                    {job.link ? (
                      <a 
                        href={job.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#E5FE40] hover:underline text-xs font-mono inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                        link
                      </a>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                  <td className="table-cell">
                    <div className="space-y-1 max-w-[200px]">
                      {job.contacts?.length > 0 ? (
                        job.contacts.slice(0, 2).map((c, i) => (
                          <div key={i} className="contact-chip text-xs">
                            <div className="font-medium text-white">{c.name || '-'}</div>
                            {c.role && <div className="text-gray-500">{c.role}</div>}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="text-[#E5FE40] hover:underline flex items-center gap-1">
                                  <Mail className="w-3 h-3" strokeWidth={1.5} />
                                </a>
                              )}
                              {c.linkedin && (
                                <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#E5FE40] hover:underline flex items-center gap-1">
                                  <Linkedin className="w-3 h-3" strokeWidth={1.5} />
                                </a>
                              )}
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="text-[#E5FE40] hover:underline flex items-center gap-1">
                                  <Phone className="w-3 h-3" strokeWidth={1.5} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      ) : <span className="text-gray-600 text-xs">-</span>}
                      {job.contacts?.length > 2 && (
                        <div className="text-gray-500 text-xs">+{job.contacts.length - 2} more</div>
                      )}
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={col.id} className="table-cell text-xs text-gray-400 font-mono">
                      {job.custom_fields?.[col.name] !== undefined 
                        ? (col.field_type === 'checkbox' 
                            ? (job.custom_fields[col.name] ? 'Yes' : 'No')
                            : String(job.custom_fields[col.name]))
                        : '-'}
                    </td>
                  ))}
                  <td className="table-cell">
                    <div className="max-w-[150px] text-xs text-gray-500 truncate" title={job.notes}>
                      {job.notes || '-'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setJobModal({ open: true, job })}
                        className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                        style={{ borderRadius: '2px' }}
                        data-testid={`edit-job-${job.id}`}
                      >
                        <Edit className="w-4 h-4" strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        style={{ borderRadius: '2px' }}
                        data-testid={`delete-job-${job.id}`}
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {jobModal.open && (
        <JobModal
          job={jobModal.job}
          columns={columns}
          onClose={() => setJobModal({ open: false, job: null })}
          onSave={() => {
            setJobModal({ open: false, job: null });
            fetchData();
          }}
        />
      )}

      {columnModal && (
        <ColumnModal
          columns={columns}
          onClose={() => setColumnModal(false)}
          onUpdate={fetchData}
        />
      )}

      {analyticsModal && (
        <AnalyticsModal
          stats={stats}
          onClose={() => setAnalyticsModal(false)}
        />
      )}
    </div>
  );
}
