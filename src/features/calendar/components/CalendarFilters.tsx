/**
 * Calendar Filters - Advanced filtering component
 */

import React, { useEffect, useState } from 'react';
import { CalendarEvent, CalendarEventStatus, CalendarEventPriority, CalendarEventType } from '@/types/calendar';
import { authStore } from '@/store/authStore';
import { User, UserRole } from '@/types';
import { employeeService } from '@/services/employee.service';
import { Button } from '@/shared/components/ui/Button';
import { logger } from '@/shared/utils/logger';
import './CalendarFilters.css';

export interface CalendarFiltersState {
  assignedTo: string[]; // Employee IDs
  assignedBy: string[]; // Creator IDs
  status: CalendarEventStatus[];
  priority: CalendarEventPriority[];
  type: CalendarEventType[];
  dateRange: {
    preset?: 'today' | 'this_week' | 'this_month' | 'custom';
    startDate?: string;
    endDate?: string;
  };
}

interface CalendarFiltersProps {
  filters: CalendarFiltersState;
  onFiltersChange: (filters: CalendarFiltersState) => void;
  onClearFilters: () => void;
  onCollapseAll?: () => void;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  onCollapseAll,
}) => {
  const { user } = authStore();
  const [employees, setEmployees] = useState<User[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assignedTo: false,
    assignedBy: false,
    status: false,
    priority: false,
    type: false,
    dateRange: false,
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const allEmployees = await employeeService.getAllEmployees();
      setEmployees(allEmployees.filter((emp: any) => emp.isActive));
    } catch (error) {
      logger.error('[CalendarFilters] Failed to load employees', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateFilter = <K extends keyof CalendarFiltersState>(
    key: K,
    value: CalendarFiltersState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleArrayFilter = <K extends 'assignedTo' | 'assignedBy' | 'status' | 'priority' | 'type'>(
    key: K,
    value: string
  ) => {
    const current = filters[key] as string[];
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, newValue as any);
  };

  const handleDateRangePreset = (preset: 'today' | 'this_week' | 'this_month') => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_week':
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(today);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    updateFilter('dateRange', {
      preset,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.assignedTo.length > 0 ||
      filters.assignedBy.length > 0 ||
      filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.type.length > 0 ||
      filters.dateRange.preset !== undefined
    );
  };

  const collapseAllSections = () => {
    setExpandedSections({
      assignedTo: false,
      assignedBy: false,
      status: false,
      priority: false,
      type: false,
      dateRange: false,
    });
  };

  const handleClearFilters = () => {
    onClearFilters();
    collapseAllSections();
  };

  // Role-based filter visibility
  const canFilterByAssignedTo = user?.role === UserRole.MANAGER || user?.role === UserRole.HR || user?.role === UserRole.ADMIN;
  const canFilterByAssignedBy = user?.role === UserRole.HR || user?.role === UserRole.ADMIN;

  const getFilterableEmployees = () => {
    if (user?.role === UserRole.EMPLOYEE) {
      return employees.filter((emp) => emp.id === user.id);
    }
    if (user?.role === UserRole.MANAGER && user.department) {
      return employees.filter((emp) => emp.department === user.department || emp.id === user.id);
    }
    return employees;
  };

  return (
    <div className="calendar-filters">
      <div className="calendar-filters-header">
        <div className="calendar-filters-title">Filters</div>
        {hasActiveFilters() && (
          <button
            className="calendar-filters-clear"
            onClick={handleClearFilters}
            title="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* Assigned To Filter */}
      {canFilterByAssignedTo && (
        <div className="calendar-filters-section">
          <button
            className="calendar-filters-section-header"
            onClick={() => toggleSection('assignedTo')}
          >
            <span>Assigned To</span>
            <span className="calendar-filters-toggle">
              {expandedSections.assignedTo ? '▼' : '▶'}
            </span>
          </button>
          {expandedSections.assignedTo && (
            <div className="calendar-filters-options">
              {user?.role === UserRole.MANAGER && (
                <label className="calendar-filters-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.assignedTo.includes('me')}
                    onChange={() => toggleArrayFilter('assignedTo', 'me')}
                  />
                  <span>Me</span>
                </label>
              )}
              {user?.role === UserRole.MANAGER && (
                <label className="calendar-filters-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.assignedTo.includes('team')}
                    onChange={() => toggleArrayFilter('assignedTo', 'team')}
                  />
                  <span>My Team</span>
                </label>
              )}
              {getFilterableEmployees().map((emp) => (
                <label key={emp.id} className="calendar-filters-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.assignedTo.includes(emp.id)}
                    onChange={() => toggleArrayFilter('assignedTo', emp.id)}
                  />
                  <span>{emp.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assigned By Filter */}
      {canFilterByAssignedBy && (
        <div className="calendar-filters-section">
          <button
            className="calendar-filters-section-header"
            onClick={() => toggleSection('assignedBy')}
          >
            <span>Assigned By</span>
            <span className="calendar-filters-toggle">
              {expandedSections.assignedBy ? '▼' : '▶'}
            </span>
          </button>
          {expandedSections.assignedBy && (
            <div className="calendar-filters-options">
              <label className="calendar-filters-checkbox">
                <input
                  type="checkbox"
                  checked={filters.assignedBy.includes('self')}
                  onChange={() => toggleArrayFilter('assignedBy', 'self')}
                />
                <span>Self</span>
              </label>
              {employees
                .filter((emp) => emp.role === UserRole.MANAGER)
                .map((emp) => (
                  <label key={emp.id} className="calendar-filters-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.assignedBy.includes(emp.id)}
                      onChange={() => toggleArrayFilter('assignedBy', emp.id)}
                    />
                    <span>{emp.name}</span>
                  </label>
                ))}
              {employees
                .filter((emp) => emp.role === UserRole.HR || emp.role === UserRole.ADMIN)
                .map((emp) => (
                  <label key={emp.id} className="calendar-filters-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.assignedBy.includes(emp.id)}
                      onChange={() => toggleArrayFilter('assignedBy', emp.id)}
                    />
                    <span>{emp.name}</span>
                  </label>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Status Filter */}
      <div className="calendar-filters-section">
        <button
          className="calendar-filters-section-header"
          onClick={() => toggleSection('status')}
        >
          <span>Status</span>
          <span className="calendar-filters-toggle">
            {expandedSections.status ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.status && (
          <div className="calendar-filters-options">
            {Object.values(CalendarEventStatus).map((status) => (
              <label key={status} className="calendar-filters-checkbox">
                <input
                  type="checkbox"
                  checked={filters.status.includes(status)}
                  onChange={() => toggleArrayFilter('status', status)}
                />
                <span>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Priority Filter */}
      <div className="calendar-filters-section">
        <button
          className="calendar-filters-section-header"
          onClick={() => toggleSection('priority')}
        >
          <span>Priority</span>
          <span className="calendar-filters-toggle">
            {expandedSections.priority ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.priority && (
          <div className="calendar-filters-options">
            {Object.values(CalendarEventPriority).map((priority) => (
              <label key={priority} className="calendar-filters-checkbox">
                <input
                  type="checkbox"
                  checked={filters.priority.includes(priority)}
                  onChange={() => toggleArrayFilter('priority', priority)}
                />
                <span>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Type Filter */}
      <div className="calendar-filters-section">
        <button
          className="calendar-filters-section-header"
          onClick={() => toggleSection('type')}
        >
          <span>Type</span>
          <span className="calendar-filters-toggle">
            {expandedSections.type ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.type && (
          <div className="calendar-filters-options">
            {Object.values(CalendarEventType).map((type) => (
              <label key={type} className="calendar-filters-checkbox">
                <input
                  type="checkbox"
                  checked={filters.type.includes(type)}
                  onChange={() => toggleArrayFilter('type', type)}
                />
                <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="calendar-filters-section">
        <button
          className="calendar-filters-section-header"
          onClick={() => toggleSection('dateRange')}
        >
          <span>Date Range</span>
          <span className="calendar-filters-toggle">
            {expandedSections.dateRange ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.dateRange && (
          <div className="calendar-filters-options">
            <div className="calendar-filters-date-presets">
              <button
                className="calendar-filters-preset-btn"
                onClick={() => handleDateRangePreset('today')}
              >
                Today
              </button>
              <button
                className="calendar-filters-preset-btn"
                onClick={() => handleDateRangePreset('this_week')}
              >
                This Week
              </button>
              <button
                className="calendar-filters-preset-btn"
                onClick={() => handleDateRangePreset('this_month')}
              >
                This Month
              </button>
            </div>
            <div className="calendar-filters-date-custom">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={filters.dateRange.startDate || ''}
                  onChange={(e) =>
                    updateFilter('dateRange', {
                      ...filters.dateRange,
                      preset: 'custom',
                      startDate: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={filters.dateRange.endDate || ''}
                  onChange={(e) =>
                    updateFilter('dateRange', {
                      ...filters.dateRange,
                      preset: 'custom',
                      endDate: e.target.value,
                    })
                  }
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

