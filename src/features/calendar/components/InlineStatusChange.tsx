/**
 * Inline Status Change - Click status badge to change status inline
 */

import React, { useState, useRef, useEffect } from 'react';
import { CalendarEventStatus } from '@/types/calendar';
import { getValidStatusTransitions } from '../utils/taskPermissions';
import './InlineStatusChange.css';

interface InlineStatusChangeProps {
  currentStatus: CalendarEventStatus;
  onStatusChange: (status: CalendarEventStatus, reason?: string) => void;
  disabled?: boolean;
}

const statusLabels: Record<CalendarEventStatus, string> = {
  [CalendarEventStatus.PLANNED]: 'Planned',
  [CalendarEventStatus.TENTATIVE]: 'Tentative',
  [CalendarEventStatus.CONFIRMED]: 'Confirmed',
  [CalendarEventStatus.IN_PROGRESS]: 'In Progress',
  [CalendarEventStatus.BLOCKED]: 'Blocked',
  [CalendarEventStatus.COMPLETED]: 'Completed',
  [CalendarEventStatus.CANCELLED]: 'Cancelled',
};

const statusColors: Record<CalendarEventStatus, string> = {
  [CalendarEventStatus.PLANNED]: '#6b7280',
  [CalendarEventStatus.TENTATIVE]: '#d97706',
  [CalendarEventStatus.CONFIRMED]: '#2563eb',
  [CalendarEventStatus.IN_PROGRESS]: '#059669',
  [CalendarEventStatus.BLOCKED]: '#dc2626',
  [CalendarEventStatus.COMPLETED]: '#059669',
  [CalendarEventStatus.CANCELLED]: '#dc2626',
};

export const InlineStatusChange: React.FC<InlineStatusChangeProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const validTransitions = getValidStatusTransitions(currentStatus);
  const allStatuses = Object.values(CalendarEventStatus);

  const handleStatusSelect = (status: CalendarEventStatus) => {
    // Check if reason is required
    const requiresReason = 
      status === CalendarEventStatus.BLOCKED ||
      status === CalendarEventStatus.CANCELLED ||
      (currentStatus === CalendarEventStatus.COMPLETED && status !== CalendarEventStatus.COMPLETED);

    if (requiresReason) {
      const reason = prompt(`Enter reason for changing status to "${statusLabels[status]}":`);
      if (reason === null) {
        // User cancelled
        return;
      }
      onStatusChange(status, reason || undefined);
    } else {
      onStatusChange(status);
    }
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <span 
        className="inline-status-badge" 
        style={{ backgroundColor: `${statusColors[currentStatus]}20`, color: statusColors[currentStatus] }}
      >
        {statusLabels[currentStatus]}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="inline-status-container">
      <button
        className="inline-status-badge"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: `${statusColors[currentStatus]}20`, color: statusColors[currentStatus] }}
        type="button"
      >
        {statusLabels[currentStatus]}
        <span className="inline-status-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="inline-status-dropdown">
          {allStatuses.map((status) => {
            const isCurrent = status === currentStatus;
            const isValid = validTransitions.includes(status) || isCurrent;

            return (
              <button
                key={status}
                className={`inline-status-option ${isCurrent ? 'current' : ''} ${!isValid ? 'disabled' : ''}`}
                onClick={() => isValid && !isCurrent && handleStatusSelect(status)}
                disabled={!isValid || isCurrent}
                type="button"
              >
                <span
                  className="inline-status-dot"
                  style={{ backgroundColor: statusColors[status] }}
                />
                {statusLabels[status]}
                {isCurrent && <span className="inline-status-current">(current)</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

