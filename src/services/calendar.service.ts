/**
 * Calendar Service - API calls for calendar events
 */

import { api } from './api';
import {
  CalendarEvent,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  CalendarEventQuery,
  CalendarEventListResponse,
  ConflictCheckResponse,
} from '@/types/calendar';
import { extractApiData } from '@/utils/api';

class CalendarService {
  /**
   * List calendar events
   */
  async listEvents(query?: CalendarEventQuery): Promise<CalendarEventListResponse> {
    // Convert arrays to comma-separated strings for query params
    const params: any = { ...query };
    if (params.employeeId && Array.isArray(params.employeeId)) {
      params.employeeId = params.employeeId.join(',');
    }
    if (params.assignedBy && Array.isArray(params.assignedBy)) {
      params.assignedBy = params.assignedBy.join(',');
    }
    if (params.type && Array.isArray(params.type)) {
      params.type = params.type.join(',');
    }
    if (params.priority && Array.isArray(params.priority)) {
      params.priority = params.priority.join(',');
    }
    if (params.status && Array.isArray(params.status)) {
      params.status = params.status.join(',');
    }

    const response = await api.get('/calendar/events', { params });
    return extractApiData(response);
  }

  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<CalendarEvent> {
    const response = await api.get(`/calendar/events/${id}`);
    return extractApiData(response);
  }

  /**
   * Create event
   */
  async createEvent(request: CreateCalendarEventRequest): Promise<CalendarEvent> {
    const response = await api.post('/calendar/events', request);
    return extractApiData(response);
  }

  /**
   * Update event
   */
  async updateEvent(id: string, request: UpdateCalendarEventRequest): Promise<CalendarEvent> {
    const response = await api.put(`/calendar/events/${id}`, request);
    return extractApiData(response);
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/calendar/events/${id}`);
  }

  /**
   * Check for conflicts
   */
  async checkConflicts(
    employeeId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ): Promise<ConflictCheckResponse> {
    const params: any = { employeeId, startTime, endTime };
    if (excludeEventId) {
      params.excludeEventId = excludeEventId;
    }
    const response = await api.get('/calendar/events/conflicts', { params });
    return extractApiData(response);
  }

  /**
   * Get assignable employees for task assignment
   */
  async getAssignableEmployees(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
  }>> {
    const response = await api.get('/calendar/assignable-employees');
    return extractApiData(response);
  }
}

export const calendarService = new CalendarService();

