/**
 * useBranchContext Hook
 * Provides branch context and department loading functionality
 */

import { useEffect } from 'react';
import { branchContextStore, Department } from '@/store/branchContextStore';
import { authStore } from '@/store/authStore';

export function useBranchContext() {
  const branchId = authStore((state) => state.user?.branchId || null);
  const departments = branchContextStore((state) => state.departments);
  const isLoading = branchContextStore((state) => state.isLoading);
  const loadDepartments = branchContextStore((state) => state.loadDepartments);
  const setBranchContext = branchContextStore((state) => state.setBranchContext);
  const clearContext = branchContextStore((state) => state.clearContext);

  // Load departments when branchId is available
  useEffect(() => {
    if (branchId) {
      // Set branch context from auth store if available
      const user = authStore.getState().user;
      if (user?.branchDepartments) {
        const departments: Department[] = user.branchDepartments.map((name) => ({
          name,
          code: name.toUpperCase().replace(/\s+/g, '_'),
          description: `${name} department`,
          category: 'general',
          isStandard: false,
        }));
        setBranchContext(branchId, departments);
      } else {
        // Load from API
        loadDepartments().catch(() => {
          // Error already logged in store
        });
      }
    } else {
      clearContext();
    }
  }, [branchId, loadDepartments, setBranchContext, clearContext]);

  return {
    branchId,
    departments,
    isLoading,
    loadDepartments,
    clearContext,
  };
}
