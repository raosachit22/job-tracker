import { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function ColumnModal({ columns, onClose, onUpdate }) {
  const [newColumn, setNewColumn] = useState({ name: '', field_type: 'text', options: [] });
  const [optionInput, setOptionInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddColumn = async () => {
    if (!newColumn.name.trim()) {
      toast.error('Column name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/columns`, newColumn, { withCredentials: true });
      toast.success('Column added');
      setNewColumn({ name: '', field_type: 'text', options: [] });
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add column');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async (id) => {
    if (!window.confirm('Delete this column? Data in existing jobs will be preserved.')) return;
    
    try {
      await axios.delete(`${API}/api/columns/${id}`, { withCredentials: true });
      toast.success('Column deleted');
      onUpdate();
    } catch {
      toast.error('Failed to delete column');
    }
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewColumn({ 
      ...newColumn, 
      options: [...newColumn.options, optionInput.trim()] 
    });
    setOptionInput('');
  };

  const removeOption = (index) => {
    setNewColumn({
      ...newColumn,
      options: newColumn.options.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-[#141414] border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: '2px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="font-heading text-xl font-bold">Custom Columns</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" data-testid="close-column-modal">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Existing Columns */}
          {columns.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Existing Columns</Label>
              {columns.map((col) => (
                <div 
                  key={col.id} 
                  className="flex items-center justify-between bg-[#0A0A0A] border border-white/10 p-3"
                  style={{ borderRadius: '2px' }}
                >
                  <div>
                    <div className="font-medium text-white">{col.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{col.field_type}</div>
                    {col.options?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Options: {col.options.join(', ')}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteColumn(col.id)}
                    className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                    style={{ borderRadius: '2px' }}
                    data-testid={`delete-column-${col.id}`}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Column */}
          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Add New Column</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Column Name</Label>
                <Input
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  placeholder="e.g. Salary Range"
                  className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                  style={{ borderRadius: '2px' }}
                  data-testid="column-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Field Type</Label>
                <Select 
                  value={newColumn.field_type} 
                  onValueChange={(v) => setNewColumn({ ...newColumn, field_type: v, options: v === 'dropdown' ? newColumn.options : [] })}
                >
                  <SelectTrigger className="bg-transparent border-white/20" style={{ borderRadius: '2px' }} data-testid="column-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10" style={{ borderRadius: '2px' }}>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dropdown Options */}
            {newColumn.field_type === 'dropdown' && (
              <div className="space-y-3">
                <Label className="text-xs text-gray-500">Dropdown Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add option..."
                    className="bg-transparent border-white/20 focus:border-[#E5FE40]"
                    style={{ borderRadius: '2px' }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    data-testid="dropdown-option-input"
                  />
                  <Button
                    type="button"
                    onClick={addOption}
                    className="bg-white/10 hover:bg-white/20 text-white"
                    style={{ borderRadius: '2px' }}
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
                {newColumn.options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newColumn.options.map((opt, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#E5FE40]/10 border border-[#E5FE40]/20 text-[#E5FE40] text-xs"
                        style={{ borderRadius: '2px' }}
                      >
                        {opt}
                        <button 
                          type="button" 
                          onClick={() => removeOption(i)}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleAddColumn}
              disabled={loading || !newColumn.name.trim()}
              className="w-full bg-[#E5FE40] text-[#0A0A0A] hover:bg-[#D4ED31] font-bold"
              style={{ borderRadius: '2px' }}
              data-testid="add-column-btn"
            >
              {loading ? 'Adding...' : 'Add Column'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
