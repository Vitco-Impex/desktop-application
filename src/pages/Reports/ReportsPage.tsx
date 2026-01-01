/**
 * Reports Page - Minimal, compact design
 */

import React, { useState, useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { reportService } from '@/services/report.service';
import { WorkReport } from '@/types';
import { ReportEditor } from '@/features/reports/components/ReportEditor';
import { ReportsList } from '@/features/reports/components/ReportsList';
import { ReportDetail } from '@/features/reports/components/ReportDetail';
import { Button } from '@/shared/components/ui';
import './ReportsPage.css';

type ViewMode = 'list' | 'create' | 'detail';

export const ReportsPage: React.FC = () => {
  const { user } = authStore();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const canCreateReports =
    user?.role === UserRole.EMPLOYEE ||
    user?.role === UserRole.MANAGER ||
    user?.role === UserRole.HR;

  useEffect(() => {
    if (viewMode === 'list') {
      loadReports();
    }
  }, [viewMode, page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await reportService.getMyReports(page, 20);
      setReports(result.reports);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setViewMode('list');
    loadReports();
  };

  const handleViewReport = async (report: WorkReport) => {
    try {
      setLoading(true);
      const fullReport = await reportService.getReportById(report.id);
      setSelectedReport(fullReport);
      setViewMode('detail');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      await reportService.deleteReport(reportId);
      
      if (viewMode === 'detail' && selectedReport?.id === reportId) {
        setViewMode('list');
        setSelectedReport(null);
      }
      
      loadReports();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-page-header">
        <div>
          <h1>Work Reports</h1>
          <p className="page-subtitle">Create and manage your work reports</p>
        </div>
        {canCreateReports && viewMode === 'list' && (
          <Button
            variant="primary"
            onClick={() => setViewMode('create')}
          >
            Create Report
          </Button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {viewMode === 'create' && (
        <ReportEditor
          onSuccess={handleCreateSuccess}
          onCancel={() => setViewMode('list')}
        />
      )}

      {viewMode === 'list' && (
        <>
          <ReportsList
            reports={reports}
            onView={handleViewReport}
            onDelete={handleDeleteReport}
            loading={loading}
          />
          {totalPages > 1 && (
            <div className="reports-pagination">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {viewMode === 'detail' && selectedReport && (
        <ReportDetail
          report={selectedReport}
          onDelete={handleDeleteReport}
          onBack={() => {
            setViewMode('list');
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};
