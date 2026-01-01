/**
 * Employee Service - API calls for employee management (HR/Admin only)
 */

import { api } from './api';
import { User, UserRole, EmployeeDetails, UpdateEmployeeDetailsRequest } from '@/types';

export interface CreateEmployeeRequest {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  address?: string;
  employeeId?: string;
  designation?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  bio?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  phoneNumber?: string;
  address?: string;
  employeeId?: string;
  designation?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  bio?: string;
  isActive?: boolean;
}

class EmployeeService {
  /**
   * Get all employees
   */
  async getAllEmployees(): Promise<User[]> {
    const response = await api.get('/employees');
    return response.data.data;
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: string): Promise<User> {
    const response = await api.get(`/employees/${id}`);
    return response.data.data;
  }

  /**
   * Create new employee
   */
  async createEmployee(request: CreateEmployeeRequest): Promise<User> {
    const response = await api.post('/employees', request);
    return response.data.data;
  }

  /**
   * Update employee
   */
  async updateEmployee(id: string, request: UpdateEmployeeRequest): Promise<User> {
    const response = await api.put(`/employees/${id}`, request);
    return response.data.data;
  }

  /**
   * Delete employee (deactivate)
   */
  async deleteEmployee(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  }

  /**
   * Reset employee password
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/employees/${id}/reset-password`, { password: newPassword });
  }
}

export const employeeService = new EmployeeService();

/**
 * Employee Details Service - API calls for comprehensive employee profile management
 */
class EmployeeDetailsService {
  /**
   * Get comprehensive employee details
   */
  async getEmployeeDetails(employeeId: string): Promise<EmployeeDetails> {
    const response = await api.get(`/employees/${employeeId}/details`);
    return response.data.data;
  }

  /**
   * Update employee details (partial update)
   */
  async updateEmployeeDetails(
    employeeId: string,
    request: UpdateEmployeeDetailsRequest
  ): Promise<EmployeeDetails> {
    const response = await api.patch(`/employees/${employeeId}/details`, request);
    return response.data.data;
  }
}

export const employeeDetailsService = new EmployeeDetailsService();

