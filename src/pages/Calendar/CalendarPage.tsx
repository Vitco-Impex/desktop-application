/**
 * Calendar Page - Full-screen calendar with planning capabilities
 */

import React, { useState, useEffect } from 'react';
import { CalendarLayout } from '@/features/calendar/components/CalendarLayout';
import { calendarService } from '@/services/calendar.service';
import { CalendarEvent, CalendarViewMode, CalendarEventQuery } from '@/types/calendar';
import { CalendarFiltersState } from '@/features/calendar/components/CalendarFilters';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import './CalendarPage.css';

export const CalendarPage: React.FC = () => {
  const { user } = authStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentFilters, setCurrentFilters] = useState<CalendarFiltersState | undefined>();

  // Skip initial load - CalendarLayout will trigger load via filters from localStorage
  const skipInitialLoadRef = React.useRef(true);
  useEffect(() => {
    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;
      return;
    }
    // Reload when date or view mode changes
    if (currentFilters) {
      loadEvents(currentFilters);
    } else {
      loadEvents();
    }
  }, [currentDate, viewMode]);

  const loadEvents = async (filters?: CalendarFiltersState) => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range based on view mode or filters
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      // Use filter date range if available, otherwise use view mode range
      if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) {
        startDate.setTime(new Date(filters.dateRange.startDate).getTime());
        endDate.setTime(new Date(filters.dateRange.endDate).getTime());
      } else {
        switch (viewMode) {
          case 'day':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'week':
            // Get start of week (Monday)
            const dayOfWeek = startDate.getDay();
            const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);
            // Get end of week (Sunday)
            endDate.setDate(diff + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'month':
            // First day of month
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            // Last day of month
            endDate.setMonth(endDate.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'timeline':
            // 3 months range
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(endDate.getMonth() + 2);
            endDate.setDate(0); // Last day of month
            endDate.setHours(23, 59, 59, 999);
            break;
        }
      }

      // Build query from filters
      const query: CalendarEventQuery = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };

      if (filters) {
        if (filters.status.length > 0) {
          query.status = filters.status.length === 1 ? filters.status[0] : filters.status;
        }
        if (filters.priority.length > 0) {
          query.priority = filters.priority.length === 1 ? filters.priority[0] : filters.priority;
        }
        if (filters.type.length > 0) {
          query.type = filters.type.length === 1 ? filters.type[0] : filters.type;
        }
        if (filters.assignedTo.length > 0) {
          // Handle special cases: 'me' and 'team'
          const employeeIds: string[] = [];
          filters.assignedTo.forEach((id) => {
            if (id === 'me' && user?.id) {
              employeeIds.push(user.id);
            } else if (id === 'team' && user?.role === UserRole.MANAGER && user?.department) {
              // Would need to fetch team members - for now, use current user's department filter
              // This should be handled in the backend based on role
            } else {
              employeeIds.push(id);
            }
          });
          if (employeeIds.length > 0) {
            query.employeeId = employeeIds.length === 1 ? employeeIds[0] : employeeIds;
          }
        }
        if (filters.assignedBy.length > 0) {
          // Handle 'self' special case
          const creatorIds: string[] = [];
          filters.assignedBy.forEach((id) => {
            if (id === 'self' && user?.id) {
              creatorIds.push(user.id);
            } else {
              creatorIds.push(id);
            }
          });
          if (creatorIds.length > 0) {
            query.assignedBy = creatorIds.length === 1 ? creatorIds[0] : creatorIds;
          }
        }
      }

      const result = await calendarService.listEvents(query);

      setEvents(result.events);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (event: CalendarEvent) => {
    await loadEvents(currentFilters); // Reload events with current filters
  };

  const handleUpdateEvent = async (event: CalendarEvent) => {
    await loadEvents(currentFilters); // Reload events with current filters
  };

  const handleDeleteEvent = async (eventId: string) => {
    await loadEvents(currentFilters); // Reload events with current filters
  };

  const handleFiltersChange = React.useCallback((newFilters: CalendarFiltersState) => {
    // Check if filters actually changed to avoid unnecessary reloads
    const newFiltersStr = JSON.stringify(newFilters);
    const currentFiltersStr = currentFilters ? JSON.stringify(currentFilters) : '';
    if (newFiltersStr === currentFiltersStr) {
      return; // No change, skip update
    }
    
    setCurrentFilters(newFilters);
    // Load events with new filters - inline the logic to avoid dependency issues
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);

        if (newFilters?.dateRange?.startDate && newFilters?.dateRange?.endDate) {
          startDate.setTime(new Date(newFilters.dateRange.startDate).getTime());
          endDate.setTime(new Date(newFilters.dateRange.endDate).getTime());
        } else {
          switch (viewMode) {
            case 'day':
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case 'week':
              const dayOfWeek = startDate.getDay();
              const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
              startDate.setDate(diff);
              startDate.setHours(0, 0, 0, 0);
              endDate.setDate(diff + 6);
              endDate.setHours(23, 59, 59, 999);
              break;
            case 'month':
              startDate.setDate(1);
              startDate.setHours(0, 0, 0, 0);
              endDate.setMonth(endDate.getMonth() + 1, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case 'timeline':
              startDate.setMonth(startDate.getMonth() - 1);
              startDate.setDate(1);
              startDate.setHours(0, 0, 0, 0);
              endDate.setMonth(endDate.getMonth() + 2);
              endDate.setDate(0);
              endDate.setHours(23, 59, 59, 999);
              break;
          }
        }

        const query: CalendarEventQuery = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        };

        if (newFilters) {
          if (newFilters.status.length > 0) {
            query.status = newFilters.status.length === 1 ? newFilters.status[0] : newFilters.status;
          }
          if (newFilters.priority.length > 0) {
            query.priority = newFilters.priority.length === 1 ? newFilters.priority[0] : newFilters.priority;
          }
          if (newFilters.type.length > 0) {
            query.type = newFilters.type.length === 1 ? newFilters.type[0] : newFilters.type;
          }
          if (newFilters.assignedTo.length > 0) {
            const employeeIds: string[] = [];
            newFilters.assignedTo.forEach((id) => {
              if (id === 'me' && user?.id) {
                employeeIds.push(user.id);
              } else if (id === 'team' && user?.role === UserRole.MANAGER && user?.department) {
                // Handled in backend
              } else {
                employeeIds.push(id);
              }
            });
            if (employeeIds.length > 0) {
              query.employeeId = employeeIds.length === 1 ? employeeIds[0] : employeeIds;
            }
          }
          if (newFilters.assignedBy.length > 0) {
            const creatorIds: string[] = [];
            newFilters.assignedBy.forEach((id) => {
              if (id === 'self' && user?.id) {
                creatorIds.push(user.id);
              } else {
                creatorIds.push(id);
              }
            });
            if (creatorIds.length > 0) {
              query.assignedBy = creatorIds.length === 1 ? creatorIds[0] : creatorIds;
            }
          }
        }

        const result = await calendarService.listEvents(query);
        setEvents(result.events);
      } catch (err: any) {
        setError(err.message || 'Failed to load calendar events');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentDate, viewMode, user, currentFilters]);

  return (
    <div className="calendar-page">
      {error && (
        <div className="calendar-page-error">
          {error}
        </div>
      )}
      <CalendarLayout
        events={events}
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={(date) => {
          setCurrentDate(date);
        }}
        onViewModeChange={setViewMode}
        onEventCreate={handleCreateEvent}
        onEventUpdate={handleUpdateEvent}
        onEventDelete={handleDeleteEvent}
        loading={loading}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
};

