/**
 * Report Detail Component
 * Displays full report content with attachments
 * Optimized: Lazy loads react-markdown to reduce initial bundle size
 */

import React, { lazy, Suspense } from 'react';
import { WorkReport } from '@/types';
import { reportService } from '@/services/report.service';
import './ReportDetail.css';

// Lazy load react-markdown - only loads when needed (reduces initial bundle by ~100KB)
const ReactMarkdown = lazy(() => import('react-markdown'));

interface ReportDetailProps {
  report: WorkReport;
  onDelete: (reportId: string) => void;
  onBack: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  onDelete,
  onBack,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
      alert('Failed to download file: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${report.title}"? This action cannot be undone.`)) {
      onDelete(report.id);
    }
  };

  return (
    <div className="report-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Reports
        </button>
        <div className="detail-header-actions">
          <button className="btn-delete-detail" onClick={handleDelete}>
            Delete Report
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-title-section">
          <h1 className="detail-title">{report.title}</h1>
          <span className="detail-date">{formatDate(report.createdAt)}</span>
        </div>

        <div className="detail-body">
          <div className="detail-content-section">
            <h2 className="section-title">Content</h2>
            <div className="markdown-content">
              <Suspense fallback={<div>Loading content...</div>}>
                <ReactMarkdown>{report.content}</ReactMarkdown>
              </Suspense>
            </div>
          </div>

          {report.attachments.length > 0 && (
            <div className="detail-attachments-section">
              <h2 className="section-title">
                Attachments ({report.attachments.length})
              </h2>
              <div className="attachments-grid">
                {report.attachments.map((attachment, index) => (
                  <div key={index} className="attachment-card">
                    <div className="attachment-card-header">
                      <span className="attachment-icon-large">
                        {getFileIcon(attachment.mimeType)}
                      </span>
                      <div className="attachment-info-detail">
                        <span className="attachment-name-detail">{attachment.fileName}</span>
                        <span className="attachment-size-detail">
                          {formatFileSize(attachment.fileSize)}
                        </span>
                      </div>
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
      </div>
    </div>
  );
};

