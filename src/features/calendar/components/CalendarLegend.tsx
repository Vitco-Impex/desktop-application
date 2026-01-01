/**
 * Calendar Legend - Dynamic legend component
 */

import React, { useMemo } from 'react';
import { CalendarEvent, CalendarEventStatus, CalendarEventPriority } from '@/types/calendar';
import './CalendarLegend.css';

interface CalendarLegendProps {
  events: CalendarEvent[];
  filters: {
    status: CalendarEventStatus[];
    priority: CalendarEventPriority[];
  };
  onStatusToggle: (status: CalendarEventStatus) => void;
  onPriorityToggle: (priority: CalendarEventPriority) => void;
  collapsed?: boolean;
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({
  events,
  filters,
  onStatusToggle,
  onPriorityToggle,
  collapsed = false,
}) => {
  const [expanded, setExpanded] = React.useState(!collapsed);

  // Calculate visible statuses and priorities from events
  const visibleStatuses = useMemo(() => {
    const statusSet = new Set<CalendarEventStatus>();
    events.forEach((event) => {
      statusSet.add(event.status);
    });
    return Array.from(statusSet);
  }, [events]);

  const visiblePriorities = useMemo(() => {
    const prioritySet = new Set<CalendarEventPriority>();
    events.forEach((event) => {
      prioritySet.add(event.priority);
    });
    return Array.from(prioritySet);
  }, [events]);

  const getStatusColor = (status: CalendarEventStatus): string => {
    const colors: Record<CalendarEventStatus, string> = {
      [CalendarEventStatus.PLANNED]: '#2563eb', // Blue
      [CalendarEventStatus.IN_PROGRESS]: '#059669', // Green
      [CalendarEventStatus.BLOCKED]: '#dc2626', // Red
      [CalendarEventStatus.COMPLETED]: '#6b7280', // Gray
      [CalendarEventStatus.TENTATIVE]: '#d97706', // Orange
      [CalendarEventStatus.CONFIRMED]: '#2563eb', // Blue
      [CalendarEventStatus.CANCELLED]: '#9ca3af', // Light gray
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityStyle = (priority: CalendarEventPriority): string => {
    const styles: Record<CalendarEventPriority, string> = {
      [CalendarEventPriority.LOW]: '1px',
      [CalendarEventPriority.MEDIUM]: '2px',
      [CalendarEventPriority.HIGH]: '3px',
      [CalendarEventPriority.URGENT]: '4px',
    };
    return styles[priority] || '2px';
  };

  if (collapsed && !expanded) {
    return (
      <div className="calendar-legend">
        <button
          className="calendar-legend-header"
          onClick={() => setExpanded(true)}
        >
          <span>Legend</span>
          <span>▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className="calendar-legend">
      <button
        className="calendar-legend-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Legend</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="calendar-legend-content">
          {/* Status Colors */}
          <div className="calendar-legend-section">
            <div className="calendar-legend-section-title">Status</div>
            <div className="calendar-legend-items">
              {Object.values(CalendarEventStatus).map((status) => {
                const isVisible = filters.status.length === 0 || filters.status.includes(status);
                const isInEvents = visibleStatuses.includes(status);
                if (!isInEvents && filters.status.length > 0) return null;

                return (
                  <div
                    key={status}
                    className={`calendar-legend-item ${!isVisible ? 'disabled' : ''} ${!isInEvents ? 'inactive' : ''}`}
                    onClick={() => onStatusToggle(status)}
                    title={`Click to ${isVisible ? 'hide' : 'show'} ${status} tasks`}
                  >
                    <div
                      className="calendar-legend-color"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                    <span className="calendar-legend-label">
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Styles */}
          <div className="calendar-legend-section">
            <div className="calendar-legend-section-title">Priority</div>
            <div className="calendar-legend-items">
              {Object.values(CalendarEventPriority).map((priority) => {
                const isVisible = filters.priority.length === 0 || filters.priority.includes(priority);
                const isInEvents = visiblePriorities.includes(priority);
                if (!isInEvents && filters.priority.length > 0) return null;

                return (
                  <div
                    key={priority}
                    className={`calendar-legend-item ${!isVisible ? 'disabled' : ''} ${!isInEvents ? 'inactive' : ''}`}
                    onClick={() => onPriorityToggle(priority)}
                    title={`Click to ${isVisible ? 'hide' : 'show'} ${priority} priority tasks`}
                  >
                    <div
                      className="calendar-legend-priority"
                      style={{
                        borderWidth: getPriorityStyle(priority),
                        borderStyle: 'solid',
                        borderColor: isVisible ? '#1f2937' : 'transparent',
                      }}
                    />
                    <span className="calendar-legend-label">
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

