/**
 * Reports List Component - Minimal, compact design
 */

import React from 'react';
import { WorkReport } from '@/types';
import { Card } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';
import { LoadingState, EmptyState } from '@/shared/components/data-display';
import { formatDate } from '@/utils/date';
import { truncate } from '@/utils/string';
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

  if (loading) {
    return <LoadingState message="Loading reports..." />;
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No Reports Yet"
        message="Create your first work report to get started."
      />
    );
  }

  return (
    <div className="reports-list">
      {reports.map((report) => (
        <Card key={report.id} className="report-card" padding="md">
          <div className="report-card-header">
            <h3 className="report-title">{report.title}</h3>
            <span className="report-date">{formatDate(report.createdAt, { includeTime: true })}</span>
          </div>

          <div className="report-card-content">
            <p className="report-preview">{truncate(report.content, 150)}</p>
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

