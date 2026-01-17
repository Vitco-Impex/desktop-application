/**
 * Company Store - Global company profile (name, logo, contact info)
 */

import { create } from 'zustand';
import { CompanyProfile, companyService } from '@/services/company.service';
import { logger } from '@/shared/utils/logger';

export interface CompanyState {
  company: CompanyProfile | null;
  isLoading: boolean;
  error: string | null;
  loadCompany: () => Promise<void>;
  setCompany: (company: CompanyProfile) => void;
}

const defaultCompany: CompanyProfile = {
  displayName: 'Company OS',
  logoUrl: null,
};

export const companyStore = create<CompanyState>((set) => ({
  company: null,
  isLoading: false,
  error: null,

  setCompany: (company: CompanyProfile) => {
    set({ company, error: null });
    try {
      // Expose to window for Electron main process if needed
      (window as any).__COMPANY_DISPLAY_NAME__ = company.displayName;
    } catch {
      // ignore in non-browser contexts
    }
  },

  loadCompany: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await companyService.getCompany();
      set({
        company: {
          ...defaultCompany,
          ...data,
        },
        isLoading: false,
        error: null,
      });
      try {
        (window as any).__COMPANY_DISPLAY_NAME__ = data.displayName || defaultCompany.displayName;
      } catch {
        // ignore
      }
    } catch (error: any) {
      logger.error('[CompanyStore] Failed to load company profile', error, {
        message: error?.message,
      });
      // Fallback to defaults but record error
      set({
        company: defaultCompany,
        isLoading: false,
        error: error?.message || 'Failed to load company profile',
      });
      try {
        (window as any).__COMPANY_DISPLAY_NAME__ = defaultCompany.displayName;
      } catch {
        // ignore
      }
    }
  },
}));


