/**
 * Admin Report Detail Modal Component
 * Modal for viewing full report details
 * Optimized: Lazy loads react-markdown to reduce initial bundle size
 */

import React, { lazy, Suspense } from 'react';
import { reportService } from '@/services/report.service';
import './AdminReportDetailModal.css';

// Lazy load react-markdown - only loads when needed (reduces initial bundle by ~100KB)
const ReactMarkdown = lazy(() => import('react-markdown'));

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

interface AdminReportDetailModalProps {
  report: AdminReport;
  onClose: () => void;
  onDelete: (reportId: string) => void;
}

export const AdminReportDetailModal: React.FC<AdminReportDetailModalProps> = ({
  report,
  onClose,
  onDelete,
}) => {

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📎';
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      await reportService.downloadAttachment(url, fileName);
    } catch (error: any) {
      alert('Failed to download file: ' + extractErrorMessage(error, 'Unknown error'));
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${report.title}"?`)) {
      onDelete(report.id);
    }
  };

  return (
    <div className="admin-report-modal-overlay" onClick={onClose}>
      <div className="admin-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report Details</h2>
          <button className="btn-close-modal" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="report-header-section">
            <div className="report-title-section">
              <h1 className="report-title">{report.title}</h1>
              <span className="report-date">{formatDate(report.createdAt, { includeTime: true, format: 'long' })}</span>
            </div>

            <div className="employee-section">
              <h3>Employee Information</h3>
              <div className="employee-details">
                <div className="detail-item">
                  <strong>Name:</strong> {report.employee.name}
                </div>
                <div className="detail-item">
                  <strong>Email:</strong> {report.employee.email}
                </div>
                {report.employee.employeeId && (
                  <div className="detail-item">
                    <strong>Employee ID:</strong> {report.employee.employeeId}
                  </div>
                )}
                {report.employee.department && (
                  <div className="detail-item">
                    <strong>Department:</strong> {report.employee.department}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="report-content-section">
            <h3>Content</h3>
            <div className="markdown-content">
              <Suspense fallback={<div>Loading content...</div>}>
                <ReactMarkdown>{report.content}</ReactMarkdown>
              </Suspense>
            </div>
          </div>

          {report.attachments.length > 0 && (
            <div className="report-attachments-section">
              <h3>Attachments ({report.attachments.length})</h3>
              <div className="attachments-list">
                {report.attachments.map((attachment, index) => (
                  <div key={index} className="attachment-item">
                    <span className="attachment-icon">{getFileIcon(attachment.mimeType)}</span>
                    <div className="attachment-info">
                      <span className="attachment-name">{attachment.fileName}</span>
                      <span className="attachment-size">{formatFileSize(attachment.fileSize)}</span>
                    </div>
                    <button
                      className="btn-download"
                      onClick={() => handleDownload(attachment.fileUrl, attachment.fileName)}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-delete-modal" onClick={handleDelete}>
            Delete Report
          </button>
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

