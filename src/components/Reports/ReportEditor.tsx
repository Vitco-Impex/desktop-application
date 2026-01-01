/**
 * Report Editor Component
 * Text editor with file attachments for creating work reports
 */

import React, { useState, useRef } from 'react';
import { reportService } from '@/services/report.service';
import './ReportEditor.css';

interface ReportEditorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FileWithPreview extends File {
  id: string;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds 10MB size limit`;
    }
    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        const fileWithId = Object.assign(file, { id: `${Date.now()}-${Math.random()}` });
        newFiles.push(fileWithId);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    }

    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setLoading(true);

    try {
      await reportService.createReport({
        title: title.trim(),
        content: content.trim(),
        attachments: attachments,
      });

      // Reset form
      setTitle('');
      setContent('');
      setAttachments([]);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-editor">
      <form onSubmit={handleSubmit} className="report-editor-form">
        <div className="editor-header">
          <h2>Create Work Report</h2>
        </div>

        {error && <div className="editor-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="report-title">
            Title <span className="required">*</span>
          </label>
          <input
            id="report-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="Enter report title..."
            maxLength={200}
            required
            disabled={loading}
          />
          <small className="form-help">{title.length} / 200 characters</small>
        </div>

        <div className="form-group">
          <label htmlFor="report-content">
            Content <span className="required">*</span>
          </label>
          <textarea
            id="report-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-textarea"
            placeholder="Write your report content here... (Markdown supported)"
            rows={12}
            required
            disabled={loading}
          />
          <small className="form-help">
            {content.length} / 50000 characters. Markdown formatting is supported.
          </small>
        </div>

        <div className="form-group">
          <label>Attachments (Optional)</label>
          <div
            ref={dropZoneRef}
            className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="drop-zone-icon">📎</div>
              <p className="drop-zone-text">
                Drag and drop files here, or{' '}
                <button
                  type="button"
                  className="drop-zone-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  browse
                </button>
              </p>
              <p className="drop-zone-hint">Maximum 10MB per file. Multiple files supported.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="file-input-hidden"
              disabled={loading}
            />
          </div>

          {attachments.length > 0 && (
            <div className="attachments-list">
              {attachments.map((file) => (
                <div key={file.id} className="attachment-item">
                  <span className="attachment-icon">{getFileIcon(file.type)}</span>
                  <div className="attachment-info">
                    <span className="attachment-name">{file.name}</span>
                    <span className="attachment-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => removeAttachment(file.id)}
                    disabled={loading}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="editor-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading || !title.trim() || !content.trim()}
          >
            {loading ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

