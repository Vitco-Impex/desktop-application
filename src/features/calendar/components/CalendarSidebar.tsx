/**
 * Calendar Sidebar - Control panel for calendar
 */

import React from 'react';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { Button } from '@/shared/components/ui/Button';
import { CalendarFilters, CalendarFiltersState } from './CalendarFilters';
import './CalendarSidebar.css';

interface CalendarSidebarProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onEventCreate: (event: CalendarEvent) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  filters: CalendarFiltersState;
  onFiltersChange: (filters: CalendarFiltersState) => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onEventCreate,
  collapsed,
  onToggleCollapse,
  filters,
  onFiltersChange,
}) => {
  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleCreateTask = () => {
    // This will be handled by parent component via callback
    // For now, we'll emit an event that parent can listen to
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('calendar:create-task', { detail: { date: currentDate } }));
    }
  };

  if (collapsed) {
    return (
      <div className="calendar-sidebar calendar-sidebar--collapsed">
        <button
          className="calendar-sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="calendar-sidebar">
      <div className="calendar-sidebar-header">
        <h3>Calendar</h3>
        <button
          className="calendar-sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label="Collapse sidebar"
        >
          ◀
        </button>
      </div>

      {/* Date & View Controls */}
      <div className="calendar-sidebar-section">
        <div className="calendar-sidebar-section-title">View</div>
        <Button variant="secondary" size="sm" onClick={handleToday} fullWidth>
          Today
        </Button>
        <input
          type="date"
          value={currentDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
          className="calendar-sidebar-date-input"
        />
        <div className="calendar-sidebar-view-selector">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              className={`calendar-sidebar-view-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => onViewModeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="calendar-sidebar-section">
        <div className="calendar-sidebar-section-title">Quick Actions</div>
        <Button variant="primary" size="sm" onClick={handleCreateTask} fullWidth>
          + Add Task
        </Button>
      </div>

      {/* Filters */}
      <CalendarFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={() => {
          onFiltersChange({
            assignedTo: [],
            assignedBy: [],
            status: [],
            priority: [],
            type: [],
            dateRange: {},
          });
        }}
      />
    </div>
  );
};

