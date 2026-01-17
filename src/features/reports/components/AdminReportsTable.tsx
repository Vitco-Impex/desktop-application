/**
 * Admin Reports Table Component
 * Table displaying all reports with selection and actions
 */

import React from 'react';
import { formatDate } from '@/utils/date';
import { truncate } from '@/utils/string';
import { LoadingState, EmptyState } from '@/shared/components/data-display';
import './AdminReportsTable.css';

interface AdminReport {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
  };
  title: string;
  content: string;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    filePublicId: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AdminReportsTableProps {
  reports: AdminReport[];
  selectedReports: Set<string>;
  onSelectReport: (reportId: string) => void;
  onSelectAll: () => void;
  onView: (report: AdminReport) => void;
  onDelete: (reportId: string) => void;
  loading?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export const AdminReportsTable: React.FC<AdminReportsTableProps> = ({
  reports,
  selectedReports,
  onSelectReport,
  onSelectAll,
  onView,
  onDelete,
  loading = false,
}) => {

  const allSelected = reports.length > 0 && reports.every((r) => selectedReports.has(r.id));
  const someSelected = reports.some((r) => selectedReports.has(r.id));

  if (loading && reports.length === 0) {
    return <LoadingState message="Loading reports..." />;
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No Reports Found"
        message="Try adjusting your filters to see more results."
      />
    );
  }

  return (
    <div className="admin-reports-table-container">
      <table className="admin-reports-table">
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected && !allSelected;
                }}
                onChange={onSelectAll}
                disabled={loading}
              />
            </th>
            <th className="col-employee">Employee</th>
            <th className="col-title">Title</th>
            <th className="col-content">Content Preview</th>
            <th className="col-attachments">Attachments</th>
            <th className="col-date">Date Created</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr 
              key={report.id} 
              className={selectedReports.has(report.id) ? 'selected' : ''}
              onClick={() => onView(report)}
              style={{ cursor: 'pointer' }}
            >
              <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedReports.has(report.id)}
                  onChange={() => onSelectReport(report.id)}
                  disabled={loading}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="col-employee" onClick={(e) => e.stopPropagation()}>
                <div className="employee-info">
                  <div className="employee-name" title={report.employee?.name || 'Unknown'}>
                    {report.employee?.name || 'Unknown'}
                  </div>
                  <div className="employee-email" title={report.employee?.email || ''}>
                    {report.employee?.email || '—'}
                  </div>
                  {report.employee?.department && (
                    <div className="employee-department" title={report.employee.department}>
                      {report.employee.department}
                    </div>
                  )}
                </div>
              </td>
              <td className="col-title" onClick={(e) => e.stopPropagation()}>
                <div className="report-title" title={report.title || 'Untitled Report'}>
                  {report.title || 'Untitled Report'}
                </div>
              </td>
              <td className="col-content" onClick={(e) => e.stopPropagation()}>
                <div className="content-preview" title={report.content || 'No content'}>
                  {report.content ? truncate(report.content, 100) : 'No content'}
                </div>
              </td>
              <td className="col-attachments" onClick={(e) => e.stopPropagation()}>
                {report.attachments && report.attachments.length > 0 ? (
                  <span className="attachments-badge" title={`${report.attachments.length} attachment(s)`}>
                    📎 {report.attachments.length}
                  </span>
                ) : (
                  <span className="no-attachments">—</span>
                )}
              </td>
              <td className="col-date" title={report.createdAt ? formatDate(report.createdAt, { includeTime: true }) : '—'} onClick={(e) => e.stopPropagation()}>
                {report.createdAt ? formatDate(report.createdAt, { includeTime: true }) : '—'}
              </td>
              <td className="col-actions">
                <div className="action-buttons">
                  <button
                    className="btn-action btn-view"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(report);
                    }}
                    disabled={loading}
                    title="View Report"
                  >
                    View
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(report.id);
                    }}
                    disabled={loading}
                    title="Delete Report"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

