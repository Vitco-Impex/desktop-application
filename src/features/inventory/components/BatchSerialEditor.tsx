/**
 * @deprecated Use NumberGrid instead. BatchSerialEditor is superseded by the unified
 * NumberGrid component which supports INPUT/SELECT mode, SERIAL/BATCH tracking, and
 * all movement types. Kept for potential backward compatibility during transition.
 *
 * Batch: Batch No, MFG Date, Expiry Date, Quantity (locked to line qty)
 * Serial: Enter/paste serial numbers; count must equal line quantity; uniqueness enforced
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input } from '@/shared/components/ui';
import type { IndustryFlags } from '@/services/inventory.service';
import './BatchSerialEditor.css';

export type BatchSerialMode = 'batch' | 'serial';

export interface BatchRow {
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  quantity: number;
}

export interface BatchSerialValues {
  batchNumber?: string; // For backward compat, coalesced from batchRows[0]
  manufacturingDate?: string;
  expiryDate?: string;
  serialNumbers?: string[];
  batchRows?: BatchRow[]; // Multi-row batch data
  quantity?: number; // Sum of batchRows or serialNumbers.length
}

interface BatchSerialEditorProps {
  mode: BatchSerialMode;
  lineQuantity: number;
  industryFlags: IndustryFlags;
  initial?: BatchSerialValues;
  onSave: (values: BatchSerialValues) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  itemId?: string;
  fromLocationId?: string;
  fetchAvailableForBatch?: (itemId: string, locationId: string, batchNumber: string) => Promise<number>;
  existingSerials?: string[]; // Serials from other lines (for duplicate check)
}

function parseSerialInput(text: string): string[] {
  return text
    .split(/[\n,\t;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getDuplicateSerials(arr: string[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const s of arr) {
    if (seen.has(s)) dupes.push(s);
    else seen.add(s);
  }
  return [...new Set(dupes)];
}

export const BatchSerialEditor: React.FC<BatchSerialEditorProps> = ({
  mode,
  lineQuantity,
  industryFlags,
  initial,
  onSave,
  onClose,
  itemId,
  fromLocationId,
  fetchAvailableForBatch,
  existingSerials,
}) => {
  const [batchNumber, setBatchNumber] = useState(initial?.batchNumber ?? '');
  const [manufacturingDate, setManufacturingDate] = useState(initial?.manufacturingDate ?? '');
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '');
  const [serialInput, setSerialInput] = useState(
    (initial?.serialNumbers ?? []).join('\n')
  );

  const requiresMfg = industryFlags.requiresBatchTracking;
  const requiresExpiry = industryFlags.hasExpiryDate;

  // Serial validation
  const serials = parseSerialInput(serialInput);
  const serialCountOk = serials.length === lineQuantity;
  const duplicateSerials = getDuplicateSerials(serials);
  const serialDuplicatesOk = duplicateSerials.length === 0;
  const serialDuplicatesAcrossDoc = (existingSerials ?? []).filter((s) => serials.includes(s));
  const serialDuplicatesAcrossDocOk = serialDuplicatesAcrossDoc.length === 0;

  // Date validation
  const today = new Date().toISOString().slice(0, 10);
  const mfgValid = !manufacturingDate || manufacturingDate <= today;
  const expiryValid = !expiryDate || expiryDate >= today;

  const canSaveBatch =
    batchNumber.trim() &&
    (!requiresMfg || manufacturingDate) &&
    (!requiresExpiry || expiryDate) &&
    mfgValid &&
    expiryValid;

  const canSaveSerial = serialCountOk && serialDuplicatesOk && serialDuplicatesAcrossDocOk && lineQuantity > 0;

  const handleSave = useCallback(() => {
    if (mode === 'batch' && canSaveBatch) {
      onSave({
        batchNumber: batchNumber.trim(),
        manufacturingDate: manufacturingDate || undefined,
        expiryDate: expiryDate || undefined,
        quantity: lineQuantity,
      });
    } else if (mode === 'serial' && canSaveSerial) {
      onSave({ serialNumbers: serials, quantity: serials.length });
    }
    onClose();
  }, [mode, canSaveBatch, canSaveSerial, batchNumber, manufacturingDate, expiryDate, lineQuantity, serials, onSave, onClose]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="batch-serial-editor-overlay" onClick={onClose}>
      <div className="batch-serial-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="batch-serial-editor-header">
          <h4>{mode === 'batch' ? 'Batch details' : 'Serial numbers'}</h4>
          <button type="button" className="batch-serial-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {mode === 'batch' && (
          <div className="batch-serial-editor-body">
            <div className="batch-serial-field">
              <label>Batch No *</label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-001"
              />
            </div>
            <div className="batch-serial-field">
              <label>
                MFG Date {requiresMfg && '*'}
              </label>
              <Input
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                max={today}
              />
              {manufacturingDate && !mfgValid && (
                <span className="batch-serial-error">MFG date cannot be in the future</span>
              )}
            </div>
            <div className="batch-serial-field">
              <label>
                Expiry Date {requiresExpiry && '*'}
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={manufacturingDate || undefined}
              />
              {expiryDate && !expiryValid && (
                <span className="batch-serial-error">Expiry date cannot be in the past</span>
              )}
            </div>
            <div className="batch-serial-field">
              <label>Quantity</label>
              <Input type="number" value={lineQuantity} readOnly disabled />
            </div>
          </div>
        )}

        {mode === 'serial' && (
          <div className="batch-serial-editor-body">
            <div className="batch-serial-field">
              <label>Serial numbers ({serials.length} / {lineQuantity}) *</label>
              <textarea
                className="batch-serial-textarea"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Enter or paste one serial per line, or comma/se semicolon separated"
                rows={6}
              />
              {!serialCountOk && (
                <span className="batch-serial-error">
                  Number of serials ({serials.length}) must equal line quantity ({lineQuantity})
                </span>
              )}
              {serialDuplicatesOk === false && duplicateSerials.length > 0 && (
                <span className="batch-serial-error">
                  Duplicate serials: {duplicateSerials.slice(0, 5).join(', ')}
                  {duplicateSerials.length > 5 ? '…' : ''}
                </span>
              )}
              {serialDuplicatesAcrossDocOk === false && serialDuplicatesAcrossDoc.length > 0 && (
                <span className="batch-serial-error">
                  Duplicate serials in other lines: {serialDuplicatesAcrossDoc.slice(0, 5).join(', ')}
                  {serialDuplicatesAcrossDoc.length > 5 ? '…' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="batch-serial-editor-footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={mode === 'batch' ? !canSaveBatch : !canSaveSerial}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
