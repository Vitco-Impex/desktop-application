/**
 * Task Form - Create/Edit task modal
 */

import React, { useState, useEffect } from 'react';
import { CalendarEvent, CreateCalendarEventRequest, UpdateCalendarEventRequest, CalendarEventType, CalendarEventPriority, CalendarEventStatus } from '@/types/calendar';
import { calendarService } from '@/services/calendar.service';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Textarea } from '@/shared/components/ui/Textarea';
import { authStore } from '@/store/authStore';
import { User } from '@/types';
import './TaskForm.css';

interface TaskFormProps {
  task?: CalendarEvent;
  initialDate?: Date;
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

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  initialDate,
  initialStartTime,
  initialEndTime,
  onClose,
  onSuccess,
}) => {
  const user = authStore.getState().user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    employeeId: task?.employeeId || user?.id || '',
    date: initialDate 
      ? initialDate.toISOString().split('T')[0] 
      : (task ? new Date(task.startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    startTime: initialStartTime || (task ? new Date(task.startTime).toTimeString().slice(0, 5) : '09:00'),
    endTime: initialEndTime || (task ? new Date(task.endTime).toTimeString().slice(0, 5) : '10:00'),
    type: (task?.type || CalendarEventType.TASK) as CalendarEventType,
    priority: (task?.priority || CalendarEventPriority.MEDIUM) as CalendarEventPriority,
    status: (task?.status || CalendarEventStatus.PLANNED) as CalendarEventStatus,
    projectId: task?.projectId || '',
  });

  useEffect(() => {
    loadAssignableEmployees();
  }, []);

  const loadAssignableEmployees = async () => {
    try {
      const employees = await calendarService.getAssignableEmployees();
      setAssignableEmployees(employees);
      // If employee role, pre-select themselves
      if (user?.role === 'employee' && !formData.employeeId) {
        setFormData((prev) => ({ ...prev, employeeId: user.id }));
      }
    } catch (err) {
      console.error('Failed to load assignable employees:', err);
      // Fallback: if user is employee, just use themselves
      if (user?.role === 'employee' && user.id) {
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

      if (task) {
        // Update existing task
        const updateRequest: UpdateCalendarEventRequest = {
          title: formData.title,
          description: formData.description || undefined,
          employeeId: formData.employeeId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
          projectId: formData.projectId || undefined,
        };

        const updatedTask = await calendarService.updateEvent(task.id, updateRequest);
        onSuccess(updatedTask);
      } else {
        // Create new task
        const createRequest: CreateCalendarEventRequest = {
          title: formData.title,
          description: formData.description || undefined,
          employeeId: formData.employeeId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          type: CalendarEventType.TASK,
          priority: formData.priority,
          status: formData.status,
          projectId: formData.projectId || undefined,
        };

        const newTask = await calendarService.createEvent(createRequest);
        onSuccess(newTask);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  // Employee can only assign to themselves
  const canChangeAssignee = user?.role !== 'employee' || !task;

  return (
    <div className="task-form-overlay" onClick={onClose}>
      <div className="task-form" onClick={(e) => e.stopPropagation()}>
        <div className="task-form-header">
          <h3>{task ? 'Edit Task' : 'Create Task'}</h3>
          <button className="task-form-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form-body">
          {error && (
            <div className="task-form-error">{error}</div>
          )}

          <div className="task-form-field">
            <label>
              Task Title <span className="required">*</span>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter task title"
              />
            </label>
          </div>

          <div className="task-form-field">
            <label>
              Description
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Enter task description"
              />
            </label>
          </div>

          <div className="task-form-field">
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
                    {emp.name} ({emp.email}) {emp.department ? `- ${emp.department}` : ''}
                  </option>
                ))}
              </select>
              {!canChangeAssignee && (
                <small className="task-form-hint">You can only create tasks for yourself</small>
              )}
            </label>
          </div>

          <div className="task-form-row">
            <div className="task-form-field">
              <label>
                Date <span className="required">*</span>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="task-form-field">
              <label>
                Start Time <span className="required">*</span>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="task-form-field">
              <label>
                End Time <span className="required">*</span>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </label>
            </div>
          </div>

          <div className="task-form-row">
            <div className="task-form-field">
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

            <div className="task-form-field">
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

          <div className="task-form-field">
            <label>
              Project ID (optional)
              <Input
                type="text"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                placeholder="Enter project ID"
              />
            </label>
          </div>

          <div className="task-form-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

