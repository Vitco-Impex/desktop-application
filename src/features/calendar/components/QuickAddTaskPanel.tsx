/**
 * Quick Add Task Panel - Minimal form for fast task creation
 * Opens on double-click on empty calendar slots
 */

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CreateCalendarEventRequest, CalendarEventType, CalendarEventPriority, CalendarEventStatus } from '@/types/calendar';
import { calendarService } from '@/services/calendar.service';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { logger } from '@/shared/utils/logger';
import './QuickAddTaskPanel.css';

interface QuickAddTaskPanelProps {
  initialDate: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  onClose: () => void;
  onSuccess: (task: CalendarEvent) => void;
}

interface AssignableEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

export const QuickAddTaskPanel: React.FC<QuickAddTaskPanelProps> = ({
  initialDate,
  initialStartTime,
  initialEndTime,
  onClose,
  onSuccess,
}) => {
  const { user } = authStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([]);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Default to 1 hour duration if times not provided
  const defaultStartTime = initialStartTime || '09:00';
  const defaultEndTime = initialEndTime || '10:00';

  const [formData, setFormData] = useState({
    title: '',
    employeeId: user?.id || '',
    date: initialDate.toISOString().split('T')[0],
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    status: CalendarEventStatus.PLANNED as CalendarEventStatus,
    priority: CalendarEventPriority.MEDIUM as CalendarEventPriority,
  });

  useEffect(() => {
    // Focus title input on mount
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
    loadAssignableEmployees();
  }, []);

  const loadAssignableEmployees = async () => {
    try {
      const employees = await calendarService.getAssignableEmployees();
      setAssignableEmployees(employees);
      // If employee role, pre-select themselves
      if (user?.role === UserRole.EMPLOYEE && !formData.employeeId) {
        setFormData((prev) => ({ ...prev, employeeId: user.id }));
      }
    } catch (err) {
      logger.error('[QuickAddTaskPanel] Failed to load assignable employees', err);
      // Fallback: if user is employee, just use themselves
      if (user?.role === UserRole.EMPLOYEE && user.id) {
        setAssignableEmployees([{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        }]);
        setFormData((prev) => ({ ...prev, employeeId: user.id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      const createRequest: CreateCalendarEventRequest = {
        title: formData.title.trim(),
        employeeId: formData.employeeId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        type: CalendarEventType.TASK,
        priority: formData.priority,
        status: formData.status,
      };

      const newTask = await calendarService.createEvent(createRequest);
      onSuccess(newTask);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isEmployee = user?.role === UserRole.EMPLOYEE;
  const canChangeAssignee = !isEmployee;

  return (
    <div className="quick-add-panel-overlay" onClick={onClose}>
      <div className="quick-add-panel" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="quick-add-panel-header">
          <h3>Quick Add Task</h3>
          <button className="quick-add-panel-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-add-panel-body">
          {error && (
            <div className="quick-add-panel-error" role="alert">
              {error}
            </div>
          )}

          <div className="quick-add-panel-field">
            <label>
              Task Title <span className="required">*</span>
              <input
                ref={titleInputRef}
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter task title"
                autoFocus
              />
            </label>
          </div>

          <div className="quick-add-panel-field">
            <label>
              Assigned To <span className="required">*</span>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
                disabled={!canChangeAssignee}
              >
                <option value="">Select employee</option>
                {assignableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.department ? `(${emp.department})` : ''}
                  </option>
                ))}
              </select>
              {!canChangeAssignee && (
                <small className="quick-add-panel-hint">You can only create tasks for yourself</small>
              )}
            </label>
          </div>

          <div className="quick-add-panel-row">
            <div className="quick-add-panel-field">
              <label>
                Date <span className="required">*</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="quick-add-panel-field">
              <label>
                Start Time <span className="required">*</span>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="quick-add-panel-field">
              <label>
                End Time <span className="required">*</span>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </label>
            </div>
          </div>

          {showMoreOptions && (
            <div className="quick-add-panel-advanced">
              <div className="quick-add-panel-row">
                <div className="quick-add-panel-field">
                  <label>
                    Priority
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as CalendarEventPriority })}
                    >
                      {Object.values(CalendarEventPriority).map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="quick-add-panel-field">
                  <label>
                    Status
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as CalendarEventStatus })}
                    >
                      {Object.values(CalendarEventStatus).map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="quick-add-panel-actions">
            <button
              type="button"
              className="quick-add-panel-link"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
            >
              {showMoreOptions ? 'Hide' : 'Show'} more options
            </button>
            <div className="quick-add-panel-buttons">
              <button type="button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading || !formData.title.trim()}>
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

