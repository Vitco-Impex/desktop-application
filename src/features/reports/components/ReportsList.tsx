/**
 * Reports List Component - Minimal, compact design
 */

import React from 'react';
import { WorkReport } from '@/types';
import { Card } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';
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
        <h3>No Reports Yet</h3>
        <p>Create your first work report to get started.</p>
      </div>
    );
  }

  return (
    <div className="reports-list">
      {reports.map((report) => (
        <Card key={report.id} className="report-card" padding="md">
          <div className="report-card-header">
            <h3 className="report-title">{report.title}</h3>
            <span className="report-date">{formatDate(report.createdAt)}</span>
          </div>

          <div className="report-card-content">
            <p className="report-preview">{truncateContent(report.content)}</p>
            {report.attachments.length > 0 && (
              <div className="report-attachments-badge">
                {report.attachments.length} {report.attachments.length === 1 ? 'attachment' : 'attachments'}
              </div>
            )}
          </div>

          <div className="report-card-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onView(report)}
            >
              View
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${report.title}"?`)) {
                  onDelete(report.id);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

