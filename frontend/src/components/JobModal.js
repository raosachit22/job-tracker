import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { X, Plus, CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUSES = ['Pending', 'Applied', 'Interviewing', 'Offered', 'Rejected', 'Ghosted'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const ROLES = [
  'Software Engineer',
  'Frontend Engineer', 
  'Backend Engineer',
  'Full Stack Engineer',
  'DevOps / SRE',
  'Data Engineer',
  'ML Engineer',
  'Product Manager',
  'Technical PM',
  'Solutions Engineer',
  'Other'
];

export default function JobModal({ job, columns, onClose, onSave }) {
  const [form, setForm] = useState({
    company: '',
    title: '',
    role: '',
    status: 'Pending',
    priority: 'Medium',
    date: '',
    link: '',
    notes: '',
    contacts: [],
    custom_fields: {},
  });
  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    if (job) {
      setForm({
        company: job.company || '',
        title: job.title || '',
        role: job.role || '',
        status: job.status || 'Pending',
        priority: job.priority || 'Medium',
        date: job.date || '',
        link: job.link || '',
        notes: job.notes || '',
        contacts: job.contacts || [],
        custom_fields: job.custom_fields || {},
      });
    }
  }, [job]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.title) {
      toast.error('Company and Title are required');
      return;
    }

    setLoading(true);
    try {
      if (job) {
        await axios.put(`${API}/api/jobs/${job.id}`, form, { withCredentials: true });
        toast.success('Job updated');
      } else {
        await axios.post(`${API}/api/jobs`, form, { withCredentials: true });
        toast.success('Job added');
      }
      onSave();
    } catch (err) {
      toast.error('Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const addContact = () => {
    setForm({
      ...form,
      contacts: [...form.contacts, { name: '', role: '', email: '', linkedin: '', phone: '' }],
    });
  };

  const updateContact = (index, field, value) => {
    const newContacts = [...form.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setForm({ ...form, contacts: newContacts });
  };

  const removeContact = (index) => {
    setForm({ ...form, contacts: form.contacts.filter((_, i) => i !== index) });
  };

  const updateCustomField = (name, value) => {
    setForm({ ...form, custom_fields: { ...form.custom_fields, [name]: value } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-[#141414] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: '2px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="font-heading text-xl font-bold">{job ? 'Edit Application' : 'Add Application'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" data-testid="close-modal">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company & Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Company Name *</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Google"
                className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                style={{ borderRadius: '2px' }}
                required
                data-testid="job-company"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Job Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
                className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                style={{ borderRadius: '2px' }}
                required
                data-testid="job-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Role Type</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-transparent border-white/20" style={{ borderRadius: '2px' }} data-testid="job-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-transparent border-white/20" style={{ borderRadius: '2px' }} data-testid="job-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="bg-transparent border-white/20" style={{ borderRadius: '2px' }} data-testid="job-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Date Applied</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-transparent border-white/20 hover:bg-white/5"
                    style={{ borderRadius: '2px' }}
                    data-testid="job-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" strokeWidth={1.5} />
                    {form.date ? format(new Date(form.date), 'PPP') : <span className="text-gray-500">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
                  <Calendar
                    mode="single"
                    selected={form.date ? new Date(form.date) : undefined}
                    onSelect={(date) => {
                      setForm({ ...form, date: date ? format(date, 'yyyy-MM-dd') : '' });
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Apply Link</Label>
              <Input
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                style={{ borderRadius: '2px' }}
                data-testid="job-link"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Interview prep, salary range, referral info..."
              className="bg-transparent border-white/20 focus:border-[#E5FE40] min-h-[80px]"
              style={{ borderRadius: '2px' }}
              data-testid="job-notes"
            />
          </div>

          {/* Custom Fields */}
          {columns.length > 0 && (
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Custom Fields</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {columns.map((col) => (
                  <div key={col.id} className="space-y-2">
                    <Label className="text-xs text-gray-500">{col.name}</Label>
                    {col.field_type === 'text' && (
                      <Input
                        value={form.custom_fields[col.name] || ''}
                        onChange={(e) => updateCustomField(col.name, e.target.value)}
                        className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                        style={{ borderRadius: '2px' }}
                      />
                    )}
                    {col.field_type === 'number' && (
                      <Input
                        type="number"
                        value={form.custom_fields[col.name] || ''}
                        onChange={(e) => updateCustomField(col.name, e.target.value)}
                        className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                        style={{ borderRadius: '2px' }}
                      />
                    )}
                    {col.field_type === 'date' && (
                      <Input
                        type="date"
                        value={form.custom_fields[col.name] || ''}
                        onChange={(e) => updateCustomField(col.name, e.target.value)}
                        className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                        style={{ borderRadius: '2px' }}
                      />
                    )}
                    {col.field_type === 'dropdown' && (
                      <Select 
                        value={form.custom_fields[col.name] || ''} 
                        onValueChange={(v) => updateCustomField(col.name, v)}
                      >
                        <SelectTrigger className="bg-transparent border-white/20" style={{ borderRadius: '2px' }}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
                          {(col.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {col.field_type === 'checkbox' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={form.custom_fields[col.name] || false}
                          onCheckedChange={(v) => updateCustomField(col.name, v)}
                        />
                        <span className="text-sm text-gray-400">Yes</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Contacts & HR</Label>
            
            {form.contacts.map((contact, i) => (
              <div key={i} className="bg-[#0A0A0A] border border-white/10 p-4 relative" style={{ borderRadius: '2px' }}>
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Name</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                      placeholder="John Doe"
                      className="bg-transparent border-white/20 focus:border-[#E5FE40] h-9"
                      style={{ borderRadius: '2px' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Role</Label>
                    <Input
                      value={contact.role}
                      onChange={(e) => updateContact(i, 'role', e.target.value)}
                      placeholder="Recruiter"
                      className="bg-transparent border-white/20 focus:border-[#E5FE40] h-9"
                      style={{ borderRadius: '2px' }}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs text-gray-500">Email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(i, 'email', e.target.value)}
                      placeholder="john@company.com"
                      className="bg-transparent border-white/20 focus:border-[#E5FE40] h-9"
                      style={{ borderRadius: '2px' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">LinkedIn</Label>
                    <Input
                      value={contact.linkedin}
                      onChange={(e) => updateContact(i, 'linkedin', e.target.value)}
                      placeholder="linkedin.com/in/..."
                      className="bg-transparent border-white/20 focus:border-[#E5FE40] h-9"
                      style={{ borderRadius: '2px' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <Input
                      value={contact.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="bg-transparent border-white/20 focus:border-[#E5FE40] h-9"
                      style={{ borderRadius: '2px' }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addContact}
              className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40"
              style={{ borderRadius: '2px' }}
              data-testid="add-contact-btn"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Add Contact
            </Button>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
              style={{ borderRadius: '2px' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#E5FE40] text-[#0A0A0A] hover:bg-[#D4ED31] font-bold"
              style={{ borderRadius: '2px' }}
              data-testid="save-job-btn"
            >
              {loading ? 'Saving...' : 'Save Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
