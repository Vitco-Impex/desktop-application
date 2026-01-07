/**
 * Company Service - API calls for global company profile
 */

import { api } from './api';

export interface CompanyProfile {
  displayName: string;
  legalName?: string;
  website?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: string;
  timezone?: string;
  logoUrl?: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpdateCompanyRequest {
  displayName?: string;
  legalName?: string;
  website?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: string;
  timezone?: string;
  // logo is sent as multipart/form-data file when present
}

class CompanyService {
  async getCompany(): Promise<CompanyProfile> {
    const response = await api.get('/company');
    return response.data.data as CompanyProfile;
  }

  /**
   * Update company profile.
   * If logoFile is provided, request is sent as multipart/form-data.
   */
  async updateCompany(
    data: UpdateCompanyRequest,
    logoFile?: File | null
  ): Promise<CompanyProfile> {
    if (logoFile) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('file', logoFile);

      const response = await api.patch('/company', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data as CompanyProfile;
    }

    const response = await api.patch('/company', data);
    return response.data.data as CompanyProfile;
  }
}

export const companyService = new CompanyService();


