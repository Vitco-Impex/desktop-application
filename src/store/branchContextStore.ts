/**
 * Branch Context Store - Zustand
 * Manages branch context and department data for the current user
 */

import { create } from 'zustand';
import { api } from '@/services/api';
import { logger } from '@/shared/utils/logger';

export interface Department {
  name: string;
  code: string;
  description: string;
  category: string;
  isStandard: boolean;
}

interface BranchContextState {
  branchId: string | null;
  departments: Department[];
  isLoading: boolean;
  lastFetched: number | null;
  setBranchContext: (branchId: string, departments: Department[]) => void;
  loadDepartments: () => Promise<Department[]>;
  clearContext: () => void;
}

// Helper to extract data from API response
const extractApiData = <T>(response: any): T => {
  if (response?.data?.data) {
    return response.data.data;
  }
  if (response?.data) {
    return response.data;
  }
  return response;
};

export const branchContextStore = create<BranchContextState>((set, get) => ({
  branchId: null,
  departments: [],
  isLoading: false,
  lastFetched: null,

  setBranchContext: (branchId: string, departments: Department[]) => {
    set({ branchId, departments, lastFetched: Date.now() });
  },

  loadDepartments: async () => {
    const state = get();
    // Cache for 5 minutes
    if (state.lastFetched && Date.now() - state.lastFetched < 5 * 60 * 1000) {
      return state.departments;
    }

    set({ isLoading: true });
    try {
      const response = await api.get('/branches/departments');
      const departments = extractApiData<Department[]>(response);
      set({ departments, isLoading: false, lastFetched: Date.now() });
      logger.debug('[BranchContextStore] Departments loaded', { count: departments.length });
      return departments;
    } catch (error) {
      set({ isLoading: false });
      logger.error('[BranchContextStore] Failed to load departments', error);
      throw error;
    }
  },

  clearContext: () => {
    set({ branchId: null, departments: [], lastFetched: null });
    logger.debug('[BranchContextStore] Context cleared');
  },
}));
