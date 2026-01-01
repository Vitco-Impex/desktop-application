/**
 * Shift Breaks Component
 * Comprehensive break management for a shift
 */

import React, { useState, useEffect } from 'react';
import { shiftService } from '@/services/shift.service';
import { Shift, ShiftBreak } from '@/types/shift';
import { Button } from '@/shared/components/ui/Button';
import './ShiftBreaks.css';

interface ShiftBreaksProps {
  shiftId: string;
}

interface BreakFormData {
  name: string;
  type: 'fixed' | 'flexible';
  startTime?: string;
  endTime?: string;
  allowedWindowStart?: string;
  allowedWindowEnd?: string;
  duration: number;
  isPaid: boolean;
  autoDeduct: boolean;
  autoStart: boolean;
  autoEnd: boolean;
  status: 'active' | 'inactive';
  minDuration?: number;
  maxDuration: number;
  dailyLimit?: number;
  order: number;
}

export const ShiftBreaks: React.FC<ShiftBreaksProps> = ({ shiftId }) => {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBreak, setEditingBreak] = useState<ShiftBreak | null>(null);
  const [breakFormData, setBreakFormData] = useState<BreakFormData>({
    name: '',
    type: 'fixed',
    duration: 60,
    isPaid: false,
    autoDeduct: true,
    autoStart: false,
    autoEnd: false,
    status: 'active',
    minDuration: 0,
    maxDuration: 60,
    order: 0,
  });

  useEffect(() => {
    loadShift();
  }, [shiftId]);

  const loadShift = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shiftService.getShift(shiftId);
      setShift(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load shift breaks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBreak = () => {
    setEditingBreak(null);
    setBreakFormData({
      name: '',
      type: 'fixed',
      startTime: '',
      endTime: '',
      duration: 60,
      isPaid: false,
      autoDeduct: true,
      autoStart: false,
      autoEnd: false,
      status: 'active',
      minDuration: 0,
      maxDuration: 60,
      order: shift?.breakRules.length || 0,
    });
    setShowForm(true);
  };

  const handleEditBreak = (breakRule: ShiftBreak, index: number) => {
    setEditingBreak(breakRule);
    setBreakFormData({
      name: breakRule.name,
      type: breakRule.type,
      startTime: breakRule.startTime || '',
      endTime: breakRule.endTime || '',
      allowedWindowStart: breakRule.allowedWindowStart || '',
      allowedWindowEnd: breakRule.allowedWindowEnd || '',
      duration: breakRule.duration,
      isPaid: breakRule.isPaid,
      autoDeduct: breakRule.autoDeduct,
      autoStart: breakRule.autoStart,
      autoEnd: breakRule.autoEnd,
      status: breakRule.status,
      minDuration: breakRule.minDuration || 0,
      maxDuration: breakRule.maxDuration,
      dailyLimit: breakRule.dailyLimit,
      order: index,
    });
    setShowForm(true);
  };

  const handleDeleteBreak = async (index: number) => {
    if (!shift) return;
    if (!window.confirm(`Are you sure you want to disable break "${shift.breakRules[index].name}"?`)) {
      return;
    }

    try {
      const updatedBreaks = [...shift.breakRules];
      updatedBreaks[index] = { ...updatedBreaks[index], status: 'inactive' };
      await shiftService.updateShift(shift.id, { breakRules: updatedBreaks });
      setSuccess('Break disabled successfully');
      await loadShift();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to disable break');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const breakData: ShiftBreak = {
        name: breakFormData.name,
        type: breakFormData.type,
        duration: breakFormData.duration,
        isPaid: breakFormData.isPaid,
        autoDeduct: breakFormData.autoDeduct,
        autoStart: breakFormData.autoStart,
        autoEnd: breakFormData.autoEnd,
        status: breakFormData.status,
        minDuration: breakFormData.minDuration || 0,
        maxDuration: breakFormData.maxDuration,
        dailyLimit: breakFormData.dailyLimit,
        order: breakFormData.order,
      };

      if (breakFormData.type === 'fixed') {
        breakData.startTime = breakFormData.startTime;
        breakData.endTime = breakFormData.endTime;
      } else {
        breakData.allowedWindowStart = breakFormData.allowedWindowStart;
        breakData.allowedWindowEnd = breakFormData.allowedWindowEnd;
      }

      const updatedBreaks = [...shift.breakRules];
      if (editingBreak) {
        // Find and update existing break
        const index = updatedBreaks.findIndex(b => b.name === editingBreak.name && b.order === editingBreak.order);
        if (index >= 0) {
          updatedBreaks[index] = breakData;
        }
      } else {
        // Add new break
        updatedBreaks.push(breakData);
      }

      await shiftService.updateShift(shift.id, { breakRules: updatedBreaks });
      setSuccess(editingBreak ? 'Break updated successfully' : 'Break added successfully');
      setShowForm(false);
      setEditingBreak(null);
      await loadShift();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save break');
    } finally {
      setSaving(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingBreak(null);
  };

  const formatTime = (time?: string): string => {
    return time || '--';
  };

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) return <div className="shift-breaks-loading">Loading breaks...</div>;
  if (error && !shift) return <div className="shift-breaks-error">{error}</div>;
  if (!shift) return <div className="shift-breaks-error">Shift not found</div>;

  const activeBreaks = shift.breakRules.filter(b => b.status === 'active');

  if (showForm) {
    return (
      <div className="shift-breaks-form-container">
        <div className="shift-breaks-form-header">
          <h3>{editingBreak ? 'Edit Break' : 'Add Break'}</h3>
          <button className="shift-breaks-close-btn" onClick={handleFormClose}>×</button>
        </div>

        <form onSubmit={handleFormSubmit} className="shift-breaks-form">
          {error && <div className="shift-breaks-error-message">{error}</div>}
          {success && <div className="shift-breaks-success-message">{success}</div>}

          <div className="shift-breaks-form-field">
            <label>Break Name *</label>
            <input
              type="text"
              value={breakFormData.name}
              onChange={(e) => setBreakFormData({ ...breakFormData, name: e.target.value })}
              required
              placeholder="e.g., Lunch, Tea Break"
            />
          </div>

          <div className="shift-breaks-form-field">
            <label>Break Type *</label>
            <select
              value={breakFormData.type}
              onChange={(e) => setBreakFormData({ ...breakFormData, type: e.target.value as 'fixed' | 'flexible' })}
              required
            >
              <option value="fixed">Fixed (Specific start/end time)</option>
              <option value="flexible">Flexible (Allowed time window)</option>
            </select>
          </div>

          {breakFormData.type === 'fixed' ? (
            <>
              <div className="shift-breaks-form-field">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={breakFormData.startTime || ''}
                  onChange={(e) => setBreakFormData({ ...breakFormData, startTime: e.target.value })}
                  required
                />
                <small>Fixed start time for this break</small>
              </div>
              <div className="shift-breaks-form-field">
                <label>End Time *</label>
                <input
                  type="time"
                  value={breakFormData.endTime || ''}
                  onChange={(e) => setBreakFormData({ ...breakFormData, endTime: e.target.value })}
                  required
                />
                <small>Fixed end time for this break</small>
              </div>
              <div className="shift-breaks-form-field">
                <label className="shift-breaks-checkbox-label">
                  <input
                    type="checkbox"
                    checked={breakFormData.autoStart}
                    onChange={(e) => setBreakFormData({ ...breakFormData, autoStart: e.target.checked })}
                  />
                  <span>Auto-start break at start time</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="shift-breaks-form-field">
                <label>Allowed Window Start *</label>
                <input
                  type="time"
                  value={breakFormData.allowedWindowStart || ''}
                  onChange={(e) => setBreakFormData({ ...breakFormData, allowedWindowStart: e.target.value })}
                  required
                />
                <small>Earliest time break can start</small>
              </div>
              <div className="shift-breaks-form-field">
                <label>Allowed Window End *</label>
                <input
                  type="time"
                  value={breakFormData.allowedWindowEnd || ''}
                  onChange={(e) => setBreakFormData({ ...breakFormData, allowedWindowEnd: e.target.value })}
                  required
                />
                <small>Latest time break can end</small>
              </div>
              <div className="shift-breaks-form-field">
                <label>Maximum Duration (minutes) *</label>
                <input
                  type="number"
                  value={breakFormData.maxDuration}
                  onChange={(e) => setBreakFormData({ ...breakFormData, maxDuration: parseInt(e.target.value) || 0 })}
                  min="1"
                  required
                />
                <small>Maximum allowed break duration</small>
              </div>
              <div className="shift-breaks-form-field">
                <label className="shift-breaks-checkbox-label">
                  <input
                    type="checkbox"
                    checked={breakFormData.autoEnd}
                    onChange={(e) => setBreakFormData({ ...breakFormData, autoEnd: e.target.checked })}
                  />
                  <span>Auto-end break after max duration</span>
                </label>
              </div>
            </>
          )}

          {breakFormData.type === 'fixed' && (
            <div className="shift-breaks-form-field">
              <label>Duration (minutes) *</label>
              <input
                type="number"
                value={breakFormData.duration}
                onChange={(e) => setBreakFormData({ ...breakFormData, duration: parseInt(e.target.value) || 0 })}
                min="1"
                required
              />
              <small>Break duration in minutes</small>
            </div>
          )}

          <div className="shift-breaks-form-field">
            <label>Minimum Duration (minutes)</label>
            <input
              type="number"
              value={breakFormData.minDuration || 0}
              onChange={(e) => setBreakFormData({ ...breakFormData, minDuration: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <small>Minimum required duration (0 = no minimum)</small>
          </div>

          <div className="shift-breaks-form-field">
            <label>Daily Limit</label>
            <input
              type="number"
              value={breakFormData.dailyLimit || ''}
              onChange={(e) => setBreakFormData({ ...breakFormData, dailyLimit: e.target.value ? parseInt(e.target.value) : undefined })}
              min="1"
            />
            <small>Max times per day (leave empty for unlimited)</small>
          </div>

          <div className="shift-breaks-form-field">
            <label className="shift-breaks-checkbox-label">
              <input
                type="checkbox"
                checked={breakFormData.isPaid}
                onChange={(e) => setBreakFormData({ ...breakFormData, isPaid: e.target.checked })}
              />
              <span>Paid break (counts toward working hours)</span>
            </label>
          </div>

          <div className="shift-breaks-form-field">
            <label className="shift-breaks-checkbox-label">
              <input
                type="checkbox"
                checked={breakFormData.autoDeduct}
                onChange={(e) => setBreakFormData({ ...breakFormData, autoDeduct: e.target.checked })}
              />
              <span>Auto-deduct from working hours (if unpaid)</span>
            </label>
          </div>

          <div className="shift-breaks-form-actions">
            <Button type="button" variant="secondary" onClick={handleFormClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingBreak ? 'Update Break' : 'Add Break'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="shift-breaks">
      <div className="shift-breaks-header">
        <div>
          <h3 className="shift-breaks-title">Breaks: {shift.name}</h3>
          <p className="shift-breaks-subtitle">Configure break rules and timings for this shift</p>
        </div>
        <Button variant="primary" onClick={handleAddBreak}>
          + Add Break
        </Button>
      </div>

      {error && <div className="shift-breaks-error-message">{error}</div>}
      {success && <div className="shift-breaks-success-message">{success}</div>}

      {activeBreaks.length === 0 ? (
        <div className="shift-breaks-empty">
          <p>No active breaks configured for this shift.</p>
          <p className="shift-breaks-hint">Click "Add Break" to configure breaks.</p>
        </div>
      ) : (
        <div className="shift-breaks-table-wrapper">
          <table className="shift-breaks-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Timing</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Paid/Unpaid</th>
                <th>Daily Limit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeBreaks
                .sort((a, b) => a.order - b.order)
                .map((breakRule, index) => {
                  const actualIndex = shift.breakRules.findIndex(b => b === breakRule);
                  return (
                    <tr key={`${breakRule.name}-${index}`}>
                      <td className="break-name">{breakRule.name}</td>
                      <td className="break-type">
                        <span className={`break-type-badge break-type-badge--${breakRule.type}`}>
                          {breakRule.type === 'fixed' ? 'Fixed' : 'Flexible'}
                        </span>
                      </td>
                      <td className="break-timing">
                        {breakRule.type === 'fixed' ? (
                          <span>{formatTime(breakRule.startTime)} - {formatTime(breakRule.endTime)}</span>
                        ) : (
                          <span>{formatTime(breakRule.allowedWindowStart)} - {formatTime(breakRule.allowedWindowEnd)}</span>
                        )}
                      </td>
                      <td className="break-duration">{formatDuration(breakRule.duration)}</td>
                      <td>
                        <span className={`break-status break-status--${breakRule.status}`}>
                          {breakRule.status}
                        </span>
                      </td>
                      <td className="break-paid">
                        <span className={breakRule.isPaid ? 'break-paid-badge break-paid-badge--paid' : 'break-paid-badge break-paid-badge--unpaid'}>
                          {breakRule.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="break-limit">{breakRule.dailyLimit || 'Unlimited'}</td>
                      <td className="break-actions">
                        <button
                          className="break-action-btn"
                          onClick={() => handleEditBreak(breakRule, actualIndex)}
                          title="Edit break"
                        >
                          ✏️
                        </button>
                        <button
                          className="break-action-btn break-action-btn--danger"
                          onClick={() => handleDeleteBreak(actualIndex)}
                          title="Disable break"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <div className="shift-breaks-info">
        <h4>Break Configuration Notes</h4>
        <ul>
          <li><strong>Fixed Breaks:</strong> Have exact start and end times. Can be auto-started.</li>
          <li><strong>Flexible Breaks:</strong> Can be taken within an allowed time window. Employee starts/ends manually.</li>
          <li><strong>Paid Breaks:</strong> Count toward working hours. Unpaid breaks are deducted from total hours.</li>
          <li><strong>Auto-deduct:</strong> Automatically subtract unpaid break time from working hours calculation.</li>
          <li><strong>Daily Limit:</strong> Maximum number of times this break can be taken per day.</li>
        </ul>
      </div>
    </div>
  );
};
