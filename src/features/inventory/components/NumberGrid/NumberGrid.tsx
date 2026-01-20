/**
 * NumberGrid - Unified modal for serial and batch entry on a movement line.
 * Supports INPUT/SELECT mode and SERIAL/BATCH tracking. Uses Modal, owns footer, Apply/Cancel, Ctrl+Enter, focus-on-open.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '@/shared/components/modals';
import { Button } from '@/shared/components/ui';
import { confirmWithFocusRecovery } from '@/shared/utils/dialog';
import type { MovementType, IndustryFlags } from '@/services/inventory.service';
import type { SerialResponse } from '@/services/inventory.service';
import type { BatchRow, ValidationError, SerialValidationItem } from '../../utils/numberGridUtils';
import { SerialInputView } from './SerialInputView';
import { SerialSelectView } from './SerialSelectView';
import { BatchInputView } from './BatchInputView';
import './NumberGrid.css';

export interface NumberGridResult {
  finalSerialList: string[];
  finalBatchList: BatchRow[];
  derivedQuantity: number;
  validationErrors: ValidationError[];
  serialStatuses?: SerialValidationItem[];
  isValid: boolean;
}

function getEmptyResult(): NumberGridResult {
  return {
    finalSerialList: [],
    finalBatchList: [],
    derivedQuantity: 0,
    validationErrors: [],
    isValid: false,
  };
}

export type NumberGridInputMode = 'INPUT' | 'SELECT';
export type NumberGridTrackingType = 'SERIAL' | 'BATCH';

export interface NumberGridProps {
  isOpen: boolean;
  mode: NumberGridInputMode;
  trackingType: NumberGridTrackingType;
  movementType: MovementType;
  itemId: string;
  variantId?: string;
  locationId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  expectedQuantity: number;
  initialSerialNumbers?: string[];
  initialBatchRows?: BatchRow[];
  existingSerialsInDoc?: string[];
  availableSerials?: SerialResponse[];
  allowOverReceive?: boolean;
  allowPartial?: boolean;
  industryFlags: IndustryFlags;
  fetchAvailableForBatch?: (itemId: string, locationId: string, batchCode: string) => Promise<number>;
  onApply: (result: NumberGridResult) => void;
  onCancel: () => void;
  onChange?: (partial: Partial<NumberGridResult>) => void;
  onValidate?: (result: NumberGridResult) => void;
}

export const NumberGrid: React.FC<NumberGridProps> = ({
  isOpen,
  mode,
  trackingType,
  movementType,
  itemId,
  variantId,
  locationId,
  fromLocationId,
  toLocationId,
  expectedQuantity,
  initialSerialNumbers = [],
  initialBatchRows = [],
  existingSerialsInDoc = [],
  availableSerials = [],
  allowOverReceive = false,
  allowPartial = false,
  industryFlags,
  fetchAvailableForBatch,
  onApply,
  onCancel,
  onChange,
  onValidate,
}) => {
  const [result, setResult] = useState<NumberGridResult>(getEmptyResult);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleResultChange = useCallback(
    (r: NumberGridResult) => {
      setResult(r);
      onChange?.({ ...r });
      onValidate?.(r);
    },
    [onChange, onValidate]
  );

  // Reset result when opening; child views will call handleResultChange after mount
  useEffect(() => {
    if (isOpen) {
      setResult(getEmptyResult());
    }
  }, [isOpen]);

  // Focus first input when opened
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Ctrl+Enter to Apply
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && result.isValid) {
        e.preventDefault();
        onApply(result);
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, onApply, onCancel]);

  const title = trackingType === 'SERIAL' ? 'Serial numbers' : 'Batch details';
  const blockingErrs = result.validationErrors.filter((e) => e.blocking);

  const hasUnsavedChanges =
    result.derivedQuantity > 0 ||
    result.finalSerialList.length > 0 ||
    result.finalBatchList.some((r) => (r.batchCode || '').trim() !== '');

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !confirmWithFocusRecovery('Discard unsaved changes?')) return;
    onCancel();
  }, [hasUnsavedChanges, onCancel]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg" className="number-grid-modal">
      <div className="number-grid-body">
        {mode === 'INPUT' && trackingType === 'SERIAL' && (
          <SerialInputView
            ref={firstInputRef}
            movementType={movementType}
            itemId={itemId}
            fromLocationId={fromLocationId}
            toLocationId={toLocationId}
            expectedQuantity={expectedQuantity}
            initialSerialNumbers={initialSerialNumbers}
            existingSerialsInDoc={existingSerialsInDoc}
            allowOverReceive={allowOverReceive}
            allowPartial={allowPartial}
            onResultChange={handleResultChange}
          />
        )}
        {mode === 'SELECT' && trackingType === 'SERIAL' && (
          <SerialSelectView
            ref={firstInputRef}
            expectedQuantity={expectedQuantity}
            availableSerials={availableSerials}
            initialSelected={initialSerialNumbers}
            allowOverReceive={allowOverReceive}
            allowPartial={allowPartial}
            onResultChange={handleResultChange}
          />
        )}
        {trackingType === 'BATCH' && (
          <BatchInputView
            ref={firstInputRef}
            expectedQuantity={expectedQuantity}
            initialBatchRows={initialBatchRows}
            industryFlags={industryFlags}
            itemId={itemId}
            locationId={locationId}
            fetchAvailableForBatch={fetchAvailableForBatch}
            allowOverReceive={allowOverReceive}
            allowPartial={allowPartial}
            onResultChange={handleResultChange}
          />
        )}
      </div>
      <div className="number-grid-footer">
        <div className="number-grid-summary">
          <span>
            Entered: {result.derivedQuantity} | Expected: {expectedQuantity}
          </span>
          {blockingErrs.length > 0 && (
            <span className="number-grid-errors">
              {blockingErrs.length} error{blockingErrs.length !== 1 ? 's' : ''}
              {blockingErrs[0] && `: ${blockingErrs[0].message}`}
            </span>
          )}
        </div>
        <div className="number-grid-actions">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (result.isValid) {
                onApply(result);
                onCancel();
              }
            }}
            disabled={!result.isValid}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};
