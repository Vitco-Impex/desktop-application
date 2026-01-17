/**
 * Shift Form Component
 * Create/Edit shift form
 */

import React, { useState, useEffect } from 'react';
import { shiftService } from '@/services/shift.service';
import { Shift, CreateShiftRequest } from '@/types/shift';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { extractErrorMessage } from '@/utils/error';
import './ShiftForm.css';

interface ShiftFormProps {
  shift?: Shift;
  onClose: () => void;
  onSuccess: (createdShiftId?: string) => void;
}

export const ShiftForm: React.FC<ShiftFormProps> = ({ shift, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateShiftRequest>({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    status: 'active',
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri by default
    weeklyOffs: [0, 6], // Sun, Sat by default
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        name: shift.name,
        code: shift.code,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
        workingDays: shift.workingDays,
        weeklyOffs: shift.weeklyOffs,
      });
    }
  }, [shift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (shift) {
        await shiftService.updateShift(shift.id, formData);
        onSuccess(shift.id);
      } else {
        const createdShift = await shiftService.createShift(formData);
        onSuccess(createdShift.id);
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to save shift'));
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    setFormData(prev => {
      const newDays = prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: newDays };
    });
  };

  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="shift-form">
      <div className="shift-form-header">
        <h3 className="shift-form-title">{shift ? 'Edit Shift' : 'Create Shift'}</h3>
        <button className="shift-form-close" onClick={onClose}>×</button>
      </div>

      {error && <div className="shift-form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="shift-form-content">
        <div className="shift-form-row">
          <div className="shift-form-field">
            <Input
              label="Shift Code *"
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., MORN, NIGHT"
              required
              disabled={!!shift} // Code can't be changed after creation
            />
            <small>Unique identifier (uppercase, no spaces)</small>
          </div>

          <div className="shift-form-field">
            <Input
              label="Shift Name *"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Morning Shift"
              required
            />
          </div>
        </div>

        <div className="shift-form-row">
          <div className="shift-form-field">
            <Input
              label="Start Time *"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              required
            />
          </div>

          <div className="shift-form-field">
            <Input
              label="End Time *"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              required
            />
          </div>

          <div className="shift-form-field">
            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>

        <div className="shift-form-field">
          <label>Working Days *</label>
          <div className="shift-form-days">
            {dayLabels.map((label, index) => (
              <Checkbox
                key={index}
                label={label.substring(0, 3)}
                checked={formData.workingDays.includes(index)}
                onChange={() => toggleWorkingDay(index)}
              />
            ))}
          </div>
          <small>Select the days this shift operates</small>
        </div>

        <div className="shift-form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
          </Button>
        </div>
      </form>
    </div>
  );
};

