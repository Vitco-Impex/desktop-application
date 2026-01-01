/**
 * Task & Work Preferences Section - Improve planning & calendar accuracy
 */

import React from 'react';
import { EmployeeDetails, UpdateEmployeeDetailsRequest, TaskVisibility, UserRole } from '@/types';
import { SectionWrapper } from '@/components/EmployeeDetails/SectionWrapper';
import './TaskPreferencesSection.css';

interface TaskPreferencesSectionProps {
  employee: EmployeeDetails;
  onUpdate: (request: UpdateEmployeeDetailsRequest) => Promise<void>;
  canEdit: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUnsavedChange: (hasChanges: boolean) => void;
}

export const TaskPreferencesSection: React.FC<TaskPreferencesSectionProps> = ({
  employee,
  onUpdate,
  canEdit,
  isExpanded,
  onToggle,
  onUnsavedChange,
}) => {
  const handleTaskVisibilityChange = async (visibility: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      defaultTaskVisibility: visibility as TaskVisibility,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleTaskCreationChange = async (creation: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      allowedTaskCreation: creation as 'self_only' | 'disabled',
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleCalendarVisibilityChange = async (scope: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      calendarVisibilityScope: scope as 'own_only' | 'team_view',
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleWorkingHoursChange = async (field: 'start' | 'end', value: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      preferredWorkingHours: {
        ...employee.preferredWorkingHours,
        [field]: value || undefined,
      },
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleTaskReceiversChange = async (role: UserRole, checked: boolean) => {
    const current = employee.canReceiveTasksFrom || [];
    const updated = checked
      ? [...current, role]
      : current.filter((r) => r !== role);
    
    const update: UpdateEmployeeDetailsRequest = {
      canReceiveTasksFrom: updated,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  return (
    <SectionWrapper
      title="Task & Work Preferences"
      icon="📋"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="task-preferences-content">
        <div className="task-preferences-grid">
          {canEdit ? (
            <div className="form-field">
              <label className="field-label">Default Task Visibility</label>
              <select
                className="form-select"
                value={employee.defaultTaskVisibility || TaskVisibility.PRIVATE}
                onChange={(e) => handleTaskVisibilityChange(e.target.value)}
                disabled={!canEdit}
              >
                <option value={TaskVisibility.PRIVATE}>Private</option>
                <option value={TaskVisibility.TEAM}>Team</option>
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label className="field-label">Default Task Visibility</label>
              <div className="field-value read-only">
                {employee.defaultTaskVisibility || TaskVisibility.PRIVATE}
              </div>
            </div>
          )}

          <div className="form-field">
            <label className="field-label">Can Receive Tasks From</label>
            {canEdit ? (
              <div className="checkbox-group">
                {[UserRole.MANAGER, UserRole.HR, UserRole.ADMIN].map((role) => (
                  <label key={role} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(employee.canReceiveTasksFrom || []).includes(role)}
                      onChange={(e) => handleTaskReceiversChange(role, e.target.checked)}
                      disabled={!canEdit}
                    />
                    <span>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="field-value read-only">
                {(employee.canReceiveTasksFrom || []).join(', ') || '—'}
              </div>
            )}
          </div>

          {canEdit ? (
            <div className="form-field">
              <label className="field-label">Allowed Task Creation</label>
              <select
                className="form-select"
                value={employee.allowedTaskCreation || 'self_only'}
                onChange={(e) => handleTaskCreationChange(e.target.value)}
                disabled={!canEdit}
              >
                <option value="self_only">Self only</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label className="field-label">Allowed Task Creation</label>
              <div className="field-value read-only">
                {employee.allowedTaskCreation || 'self_only'}
              </div>
            </div>
          )}

          <div className="form-field">
            <label className="field-label">Preferred Working Hours (Advisory)</label>
            {canEdit ? (
              <div className="time-range-group">
                <input
                  type="time"
                  className="form-input time-input"
                  value={employee.preferredWorkingHours?.start || ''}
                  onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                  disabled={!canEdit}
                />
                <span className="time-separator">to</span>
                <input
                  type="time"
                  className="form-input time-input"
                  value={employee.preferredWorkingHours?.end || ''}
                  onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            ) : (
              <div className="field-value read-only">
                {employee.preferredWorkingHours?.start && employee.preferredWorkingHours?.end
                  ? `${employee.preferredWorkingHours.start} to ${employee.preferredWorkingHours.end}`
                  : '—'}
              </div>
            )}
          </div>

          {canEdit ? (
            <div className="form-field">
              <label className="field-label">Calendar Visibility Scope</label>
              <select
                className="form-select"
                value={employee.calendarVisibilityScope || 'own_only'}
                onChange={(e) => handleCalendarVisibilityChange(e.target.value)}
                disabled={!canEdit}
              >
                <option value="own_only">Own tasks only</option>
                <option value="team_view">Team view (manager)</option>
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label className="field-label">Calendar Visibility Scope</label>
              <div className="field-value read-only">
                {employee.calendarVisibilityScope || 'own_only'}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
};

