/**
 * Report Service - API calls for work reports
 */

import { api } from './api';
import { WorkReport } from '@/types';
import { extractApiData } from '@/utils/api';
import { logger } from '@/shared/utils/logger';

export interface CreateReportRequest {
  title: string;
  content: string;
  attachments: File[];
}

export interface ReportsListResponse {
  reports: WorkReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ReportService {
  /**
   * Create a new work report
   */
  async createReport(request: CreateReportRequest): Promise<WorkReport> {
    const formData = new FormData();
    formData.append('title', request.title);
    formData.append('content', request.content);

    // Append all attachments
    request.attachments.forEach((file) => {
      formData.append('attachments', file);
    });

    // Axios will automatically set Content-Type with boundary for FormData
    const response = await api.post('/reports', formData);

    return extractApiData(response);
  }

  /**
   * Get user's reports (paginated)
   */
  async getMyReports(page: number = 1, limit: number = 20): Promise<ReportsListResponse> {
    const response = await api.get('/reports', {
      params: { page, limit },
    });

    return extractApiData(response);
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<WorkReport> {
    const response = await api.get(`/reports/${id}`);
    return extractApiData(response);
  }

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<void> {
    await api.delete(`/reports/${id}`);
  }

  /**
   * Download attachment file
   */
  async downloadAttachment(url: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      logger.error('[ReportService] Failed to download attachment', error, {
        fileName,
        url,
      });
      throw new Error('Failed to download file');
    }
  }

  /**
   * Get all reports (admin only)
   */
  async getAllReports(filters: {
    page?: number;
    limit?: number;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<ReportsListResponse & { reports: any[] }> {
    const response = await api.get('/reports/admin/all', {
      params: filters,
    });

    return extractApiData(response);
  }

  /**
   * Bulk delete reports (admin only)
   */
  async bulkDeleteReports(reportIds: string[]): Promise<{ deletedCount: number; failedIds: string[] }> {
    const response = await api.delete('/reports/admin/bulk', {
      data: { reportIds },
    });

    return extractApiData(response);
  }

  /**
   * Export reports (admin only)
   */
  async exportReports(
    format: 'csv' | 'pdf',
    filters: {
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: 'createdAt' | 'updatedAt' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<void> {
    try {
      const response = await api.get('/reports/admin/export', {
        params: {
          format,
          ...filters,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `reports-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      logger.error('[ReportService] Failed to export reports', error, {
        format,
        filters,
      });
      throw new Error('Failed to export reports');
    }
  }
}

export const reportService = new ReportService();

