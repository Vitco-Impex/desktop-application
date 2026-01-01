/**
 * Calendar Types
 */

export enum CalendarEventType {
  TASK = 'task',
  MEETING = 'meeting',
  EVENT = 'event',
  SHIFT = 'shift',
  LEAVE = 'leave',
}

export enum CalendarEventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum CalendarEventStatus {
  PLANNED = 'planned',
  TENTATIVE = 'tentative',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export type CalendarViewMode = 'day' | 'week' | 'month' | 'timeline';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  allDay?: boolean;
  employeeId: string;
  employeeName?: string;
  createdBy: string;
  createdByName?: string;
  type: CalendarEventType;
  priority: CalendarEventPriority;
  status: CalendarEventStatus;
  projectId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  employeeId: string;
  type: CalendarEventType;
  priority?: CalendarEventPriority;
  status?: CalendarEventStatus;
  projectId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCalendarEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  employeeId?: string;
  type?: CalendarEventType;
  priority?: CalendarEventPriority;
  status?: CalendarEventStatus;
  projectId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
}

export interface CalendarEventQuery {
  startDate?: string;
  endDate?: string;
  employeeId?: string | string[];
  assignedBy?: string | string[];
  teamId?: string;
  type?: CalendarEventType | CalendarEventType[];
  priority?: CalendarEventPriority | CalendarEventPriority[];
  status?: CalendarEventStatus | CalendarEventStatus[];
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CalendarEventListResponse {
  events: CalendarEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConflictCheckResponse {
  hasConflict: boolean;
  conflicts: CalendarEvent[];
}

