/**
 * Shift Service - API calls for shift management
 */

import { api } from './api';
import {
  Shift,
  CreateShiftRequest,
  UpdateShiftRequest,
  ShiftListQuery,
  ShiftListResponse,
  ShiftAssignment,
  CreateShiftAssignmentRequest,
  UpdateShiftAssignmentRequest,
  ShiftAssignmentQuery,
  ShiftAssignmentListResponse,
} from '@/types/shift';

class ShiftService {
  /**
   * List shifts
   */
  async listShifts(query?: ShiftListQuery): Promise<ShiftListResponse> {
    const response = await api.get('/shifts', { params: query });
    return response.data.data;
  }

  /**
   * Get shift by ID
   */
  async getShift(id: string): Promise<Shift> {
    const response = await api.get(`/shifts/${id}`);
    return response.data.data;
  }

  /**
   * Create shift
   */
  async createShift(data: CreateShiftRequest): Promise<Shift> {
    const response = await api.post('/shifts', data);
    return response.data.data;
  }

  /**
   * Update shift
   */
  async updateShift(id: string, data: UpdateShiftRequest): Promise<Shift> {
    const response = await api.put(`/shifts/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete shift
   */
  async deleteShift(id: string): Promise<void> {
    await api.delete(`/shifts/${id}`);
  }

  /**
   * Get active shifts
   */
  async getActiveShifts(): Promise<Shift[]> {
    const response = await api.get('/shifts/active');
    return response.data.data;
  }

  /**
   * Get employees assigned to shift
   */
  async getShiftEmployees(shiftId: string): Promise<ShiftAssignment[]> {
    const response = await api.get(`/shifts/${shiftId}/employees`);
    return response.data.data;
  }

  /**
   * List shift assignments
   */
  async listAssignments(query?: ShiftAssignmentQuery): Promise<ShiftAssignmentListResponse> {
    const response = await api.get('/shifts/assignments', { params: query });
    return response.data.data;
  }

  /**
   * Get employee's current shift
   */
  async getEmployeeShift(employeeId: string, date?: Date): Promise<ShiftAssignment | null> {
    const params = date ? { date: date.toISOString() } : {};
    const response = await api.get(`/shifts/assignments/employee/${employeeId}`, { params });
    return response.data.data;
  }

  /**
   * Create shift assignment
   */
  async createAssignment(data: CreateShiftAssignmentRequest): Promise<ShiftAssignment & { warning?: string }> {
    const response = await api.post('/shifts/assignments', data);
    const assignment = response.data.data;
    // Include warning if present in response
    if (response.data.warning) {
      (assignment as any).warning = response.data.warning;
    }
    return assignment;
  }

  /**
   * Update shift assignment
   */
  async updateAssignment(id: string, data: UpdateShiftAssignmentRequest): Promise<ShiftAssignment> {
    const response = await api.put(`/shifts/assignments/${id}`, data);
    return response.data.data;
  }

  /**
   * Cancel shift assignment
   */
  async cancelAssignment(id: string): Promise<void> {
    await api.delete(`/shifts/assignments/${id}`);
  }
}

export const shiftService = new ShiftService();

