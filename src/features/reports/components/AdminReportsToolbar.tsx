/**
 * Admin Reports Toolbar Component
 * Toolbar with bulk actions and export buttons
 */

import React from 'react';
import './AdminReportsToolbar.css';

interface AdminReportsToolbarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

export const AdminReportsToolbar: React.FC<AdminReportsToolbarProps> = ({
  selectedCount,
  onBulkDelete,
  onExportCSV,
  onExportPDF,
  onClearSelection,
  loading = false,
}) => {
  if (selectedCount === 0) {
    return (
      <div className="admin-reports-toolbar">
        <div className="toolbar-section">
          <h3>Export Reports</h3>
          <div className="toolbar-actions">
            <button
              className="btn-export btn-export-csv"
              onClick={onExportCSV}
              disabled={loading}
            >
              Export CSV
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={onExportPDF}
              disabled={loading}
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-reports-toolbar toolbar-with-selection">
      <div className="toolbar-section">
        <div className="selection-info">
          <strong>{selectedCount}</strong> report{selectedCount !== 1 ? 's' : ''} selected
        </div>
        <div className="toolbar-actions">
          <button
            className="btn-bulk-delete"
            onClick={onBulkDelete}
            disabled={loading}
          >
            Delete Selected
          </button>
          <button
            className="btn-clear-selection"
            onClick={onClearSelection}
            disabled={loading}
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
};

