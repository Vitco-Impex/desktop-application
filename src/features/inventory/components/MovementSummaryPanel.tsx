/**
 * Movement Summary Panel - Sticky right panel with totals, validation, and actions
 */

import React, { useState, forwardRef } from 'react';
import { Button } from '@/shared/components/ui';
import './MovementSummaryPanel.css';

export interface StockImpactEntry {
  locationId: string;
  locationName: string;
  change: number;
  before: number;
  after: number;
}

interface MovementSummaryPanelProps {
  totalLines: number;
  totalQuantity: number;
  errors: string[];
  warnings: string[];
  requiresApproval: boolean;
  onSaveDraft: () => void;
  onValidate: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  stockImpact?: StockImpactEntry[];
  impactErrors?: string[];
}

export interface MovementSummaryPanelHandle {
  clickSaveDraft: () => void;
  clickSubmit: () => void;
}

export const MovementSummaryPanel = forwardRef<MovementSummaryPanelHandle, MovementSummaryPanelProps>(({
  totalLines,
  totalQuantity,
  errors,
  warnings,
  requiresApproval,
  onSaveDraft,
  onValidate,
  onSubmit,
  onCancel,
  loading,
  stockImpact = [],
  impactErrors = [],
}, ref) => {
  const allErrors = [...errors, ...impactErrors];
  const [impactOpen, setImpactOpen] = useState(false);
  const saveDraftButtonRef = React.useRef<HTMLButtonElement>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => ({
    clickSaveDraft: () => saveDraftButtonRef.current?.click(),
    clickSubmit: () => submitButtonRef.current?.click(),
  }));

  return (
    <div className="movement-summary-panel">
      <div className="summary-header">
        <h3>Summary</h3>
      </div>

      <div className="summary-stats">
        <div className="stat-item">
          <label>Total Lines</label>
          <div className="stat-value">{totalLines}</div>
        </div>
        <div className="stat-item">
          <label>Total Quantity</label>
          <div className="stat-value">{totalQuantity}</div>
        </div>
        <div className="stat-item">
          <label>Approval Required</label>
          <div className="stat-value">{requiresApproval ? 'Yes' : 'No'}</div>
        </div>
      </div>

      {stockImpact.length > 0 && (
        <div className="summary-stock-impact">
          <button
            type="button"
            className="summary-stock-impact-toggler"
            onClick={() => setImpactOpen((o) => !o)}
            aria-expanded={impactOpen}
          >
            <span className="stock-impact-chevron">{impactOpen ? '▼' : '▶'}</span>
            <span>Stock Impact Preview</span>
            <span className="stock-impact-badge">({stockImpact.length})</span>
          </button>
          {impactOpen && (
            <div className="stock-impact-list">
              {stockImpact.map((s) => (
                <div key={s.locationId} className="stock-impact-item">
                  <div className="stock-impact-loc">{s.locationName}</div>
                  <div className="stock-impact-row">
                    <span>Change</span>
                    <span className={s.change >= 0 ? 'positive' : 'negative'}>
                      {s.change >= 0 ? '+' : ''}{s.change}
                    </span>
                  </div>
                  <div className="stock-impact-row">
                    <span>Before</span>
                    <span>{s.before}</span>
                  </div>
                  <div className="stock-impact-row">
                    <span>After</span>
                    <span>{s.after}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {allErrors.length > 0 && (
        <div className="summary-errors">
          <h4>Errors ({allErrors.length})</h4>
          <ul>
            {allErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="summary-warnings">
          <h4>Warnings ({warnings.length})</h4>
          <ul>
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {allErrors.length === 0 && warnings.length === 0 && (
        <div className="summary-status-ok">
          ✓ All validations passed
        </div>
      )}

      <div className="summary-actions">
        <Button
          ref={saveDraftButtonRef}
          variant="secondary"
          onClick={onSaveDraft}
          disabled={loading || allErrors.length > 0}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          Save as Draft
        </Button>
        <Button
          variant="secondary"
          onClick={onValidate}
          disabled={loading}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          Validate
        </Button>
        <Button
          ref={submitButtonRef}
          variant="primary"
          onClick={onSubmit}
          disabled={loading || allErrors.length > 0}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          style={{ width: '100%' }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
});

MovementSummaryPanel.displayName = 'MovementSummaryPanel';
