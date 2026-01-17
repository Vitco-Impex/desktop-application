/**
 * Branch Service - API calls for branch management
 */

import { api } from './api';
import { Branch, CreateBranchRequest, UpdateBranchRequest } from '@/types';
import { extractApiData } from '@/utils/api';

class BranchService {
  /**
   * Get all branches
   */
  async getBranches(filters?: { isActive?: boolean }): Promise<Branch[]> {
    const params = filters?.isActive !== undefined ? { isActive: filters.isActive } : {};
    const response = await api.get('/branches', { params });
    return extractApiData(response);
  }

  /**
   * Get branch by ID
   */
  async getBranch(id: string): Promise<Branch> {
    const response = await api.get(`/branches/${id}`);
    return extractApiData(response);
  }

  /**
   * Create new branch (Admin only)
   */
  async createBranch(request: CreateBranchRequest): Promise<Branch> {
    const response = await api.post('/branches', request);
    return extractApiData(response);
  }

  /**
   * Update branch (Admin only)
   */
  async updateBranch(id: string, request: UpdateBranchRequest): Promise<Branch> {
    const response = await api.patch(`/branches/${id}`, request);
    return extractApiData(response);
  }

  /**
   * Delete branch (Admin only)
   */
  async deleteBranch(id: string): Promise<void> {
    await api.delete(`/branches/${id}`);
  }

  /**
   * Get employees in branch
   */
  async getBranchEmployees(branchId: string): Promise<any[]> {
    const response = await api.get(`/branches/${branchId}/employees`);
    return extractApiData(response);
  }
}

export const branchService = new BranchService();
