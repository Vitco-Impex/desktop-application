/**
 * Confirmation Modal - For critical changes (role, shift, permissions)
 */

import React, { useState } from 'react';
import { UpdateEmployeeDetailsRequest } from '@/types';
import { Button } from '@/shared/components/ui';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  changes: UpdateEmployeeDetailsRequest;
  employeeName: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  changes,
  employeeName,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const getChangeDescription = (): string => {
    const descriptions: string[] = [];

    if (changes.role) {
      descriptions.push(`Role change to ${changes.role}`);
    }
    if (changes.assignedShiftId) {
      descriptions.push('Shift assignment change');
    }
    if (changes.shiftAssignmentType) {
      descriptions.push(`Shift assignment type: ${changes.shiftAssignmentType}`);
    }
    if (changes.attendanceOverridePermission !== undefined) {
      descriptions.push(`Attendance override permission: ${changes.attendanceOverridePermission}`);
    }
    if (changes.taskStatusOverridePermission !== undefined) {
      descriptions.push('Task status override permission change');
    }
    if (changes.overtimeEligibilityOverride !== undefined) {
      descriptions.push('Overtime eligibility override change');
    }
    if (changes.breakRuleOverride !== undefined) {
      descriptions.push('Break rule override change');
    }
    if (changes.holidayWorkingPermission !== undefined) {
      descriptions.push('Holiday working permission change');
    }

    return descriptions.join(', ') || 'Profile changes';
  };

  const requiresReason = !!(changes.role || changes.assignedShiftId || changes.shiftAssignmentType);

  const handleConfirm = () => {
    if (requiresReason && !reason.trim()) {
      return; // Don't proceed without reason
    }
    onConfirm(reason.trim() || undefined);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Confirm Changes</h2>
        <div className="modal-body">
          <p className="modal-message">
            You are about to make the following changes to <strong>{employeeName}</strong>:
          </p>
          <div className="modal-changes">
            <strong>Changes:</strong> {getChangeDescription()}
          </div>

          {requiresReason && (
            <div className="modal-reason">
              <label htmlFor="change-reason" className="reason-label">
                Reason for change <span className="required">*</span>
              </label>
              <textarea
                id="change-reason"
                className="reason-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for this change..."
                rows={3}
                required
              />
            </div>
          )}

          <div className="modal-warning">
            <strong>⚠️ Warning:</strong> These changes may affect attendance calculations, permissions, and workflows.
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={requiresReason && !reason.trim()}
          >
            Confirm Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

