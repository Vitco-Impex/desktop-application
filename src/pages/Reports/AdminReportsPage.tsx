/**
 * Admin Reports Page - Minimal, compact design
 */

import React, { useState, useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { reportService } from '@/services/report.service';
import { WorkReport } from '@/types';
import { AdminReportsFilters } from '@/features/reports/components/AdminReportsFilters';
import { AdminReportsToolbar } from '@/features/reports/components/AdminReportsToolbar';
import { AdminReportsTable } from '@/features/reports/components/AdminReportsTable';
import { AdminReportDetailModal } from '@/features/reports/components/AdminReportDetailModal';
import { Button } from '@/shared/components/ui';
import { extractErrorMessage } from '@/utils/error';
import './AdminReportsPage.css';

interface ReportFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const AdminReportsPage: React.FC = () => {
  const { user } = authStore();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  useEffect(() => {
    loadReports();
  }, [page, filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await reportService.getAllReports({
        page,
        limit: 20,
        ...filters,
      });
      setReports(result.reports);
      setTotalPages(result.totalPages);
      setTotalReports(result.total);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to load reports'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleViewReport = async (report: WorkReport) => {
    try {
      setLoading(true);
      const fullReport = await reportService.getReportById(report.id);
      setSelectedReport(fullReport);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      await reportService.deleteReport(reportId);
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
      loadReports();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete report'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} report(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await Promise.all(Array.from(selectedIds).map(id => reportService.deleteReport(id)));
      setSelectedIds(new Set());
      loadReports();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete reports'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      await reportService.exportReports('csv', filters);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to export reports'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      await reportService.exportReports('pdf', filters);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to export reports'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (reportId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  return (
    <div className="admin-reports-page">
      <div className="admin-reports-header">
        <div>
          <h1>Admin Reports</h1>
          <p className="page-subtitle">Manage and review all employee work reports</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <AdminReportsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        loading={loading}
      />

      <AdminReportsToolbar
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        onClearSelection={() => setSelectedIds(new Set())}
        loading={loading}
      />

      <AdminReportsTable
        reports={reports}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onView={handleViewReport}
        onDelete={handleDeleteReport}
        loading={loading}
        totalReports={totalReports}
      />

      {totalPages > 1 && (
        <div className="admin-reports-pagination">
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

      {selectedReport && (
        <AdminReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDelete={handleDeleteReport}
        />
      )}
    </div>
  );
};
