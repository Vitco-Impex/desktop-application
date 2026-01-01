/**
 * Reports List Component
 * Displays list of user's work reports
 */

import React from 'react';
import { WorkReport } from '@/types';
import './ReportsList.css';

interface ReportsListProps {
  reports: WorkReport[];
  onView: (report: WorkReport) => void;
  onDelete: (reportId: string) => void;
  loading?: boolean;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  onView,
  onDelete,
  loading = false,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  if (loading) {
    return (
      <div className="reports-list-loading">
        <p>Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="reports-list-empty">
        <div className="empty-icon">📋</div>
        <h3>No Reports Yet</h3>
        <p>Create your first work report to get started.</p>
      </div>
    );
  }

  return (
    <div className="reports-list">
      {reports.map((report) => (
        <div key={report.id} className="report-card">
          <div className="report-card-header">
            <h3 className="report-title">{report.title}</h3>
            <span className="report-date">{formatDate(report.createdAt)}</span>
          </div>

          <div className="report-card-content">
            <p className="report-preview">{truncateContent(report.content)}</p>
            {report.attachments.length > 0 && (
              <div className="report-attachments-badge">
                <span className="attachment-count-icon">📎</span>
                <span className="attachment-count">
                  {report.attachments.length} {report.attachments.length === 1 ? 'attachment' : 'attachments'}
                </span>
              </div>
            )}
          </div>

          <div className="report-card-actions">
            <button
              className="btn-view"
              onClick={() => onView(report)}
            >
              View
            </button>
            <button
              className="btn-delete"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${report.title}"?`)) {
                  onDelete(report.id);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

