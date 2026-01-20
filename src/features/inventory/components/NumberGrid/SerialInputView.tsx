/**
 * SerialInputView - SERIAL + INPUT: textarea, parse, list with backend-verified status.
 * For RECEIPT/ADJUSTMENT: NOT_FOUND → New (allowed). For ISSUE/TRANSFER: SELECT only (no INPUT).
 * Quantity derived from serial count. Apply blocked if any row is ❌, ⚠, 🔒, ♻, or ⏳ Checking.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { inventoryService } from '@/services/inventory.service';
import type { NumberGridResult } from './NumberGrid';
import type { SerialValidationItem, SerialValidationStatus } from '../../utils/numberGridUtils';
import { parseSerialInput, getDuplicateSerials, validateSerialsSync, serialStatusToLabel } from '../../utils/numberGridUtils';

export interface SerialInputViewProps {
  movementType: string;
  itemId: string;
  fromLocationId?: string;
  toLocationId?: string;
  expectedQuantity: number;
  initialSerialNumbers: string[];
  existingSerialsInDoc: string[];
  allowOverReceive: boolean;
  allowPartial: boolean;
  onResultChange: (r: NumberGridResult) => void;
}

export const SerialInputView = forwardRef<HTMLTextAreaElement | null, SerialInputViewProps>(
  (
    {
      movementType,
      itemId,
      fromLocationId,
      toLocationId,
      expectedQuantity,
      initialSerialNumbers,
      existingSerialsInDoc,
      allowOverReceive,
      allowPartial,
      onResultChange,
    },
    ref
  ) => {
    const [serialInput, setSerialInput] = useState(initialSerialNumbers.length > 0 ? initialSerialNumbers.join('\n') : '');
    const [serialStatuses, setSerialStatuses] = useState<SerialValidationItem[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelledRef = useRef(false);

    const parsed = useMemo(() => parseSerialInput(serialInput), [serialInput]);
    const dupes = useMemo(() => getDuplicateSerials(parsed), [parsed]);
    const dupeSet = useMemo(() => new Set(dupes), [dupes]);
    const docSet = useMemo(() => new Set(existingSerialsInDoc.map((s) => s.toUpperCase())), [existingSerialsInDoc]);

    const validationErrors = useMemo(
      () => validateSerialsSync(parsed, expectedQuantity, existingSerialsInDoc, allowOverReceive, allowPartial),
      [parsed, expectedQuantity, existingSerialsInDoc, allowOverReceive, allowPartial]
    );

    const getRowStatus = useCallback(
      (i: number): { status: SerialValidationStatus; allowForMovementType: boolean } => {
        const s = parsed[i];
        if (dupeSet.has(s) || docSet.has(s)) return { status: 'DUPLICATE', allowForMovementType: false };
        const r = serialStatuses[i];
        if (r) return { status: r.status as SerialValidationStatus, allowForMovementType: r.allowForMovementType };
        return { status: 'CHECKING', allowForMovementType: false };
      },
      [parsed, dupeSet, docSet, serialStatuses]
    );

    useEffect(() => {
      if (parsed.length === 0) {
        setSerialStatuses([]);
        return;
      }
      setSerialStatuses(parsed.map((s) => ({ serialNumber: s, status: 'CHECKING', allowForMovementType: false })));
      cancelledRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        inventoryService
          .validateSerialsForMovement({ itemId, movementType, serialNumbers: parsed, fromLocationId, toLocationId })
          .then((res) => {
            if (!cancelledRef.current) setSerialStatuses(res);
          })
          .catch(() => {
            if (!cancelledRef.current) setSerialStatuses(parsed.map((s) => ({ serialNumber: s, status: 'NOT_FOUND', message: 'Validation failed', allowForMovementType: false })));
          });
      }, 350);
      return () => {
        cancelledRef.current = true;
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [parsed, movementType, itemId, fromLocationId, toLocationId]);

    const serialStatusesForResult = useMemo(
      () =>
        parsed.map((s, i) => {
          const r = getRowStatus(i);
          return { serialNumber: s, status: r.status, allowForMovementType: r.allowForMovementType };
        }),
      [parsed, getRowStatus]
    );

    const isValid = useMemo(() => {
      const syncOk = validationErrors.filter((e) => e.blocking).length === 0 && (expectedQuantity === 0 || parsed.length > 0);
      const allAllow = parsed.length === 0 || parsed.every((_, i) => getRowStatus(i).allowForMovementType);
      const noneChecking = parsed.length === 0 || !serialStatuses.some((s) => s.status === 'CHECKING');
      return !!(syncOk && allAllow && noneChecking);
    }, [validationErrors, expectedQuantity, parsed, serialStatuses, getRowStatus]);

    const result: NumberGridResult = useMemo(
      () => ({
        finalSerialList: parsed,
        finalBatchList: [],
        derivedQuantity: parsed.length,
        validationErrors,
        serialStatuses: serialStatusesForResult,
        isValid,
      }),
      [parsed, validationErrors, serialStatusesForResult, isValid]
    );

    useEffect(() => {
      onResultChange(result);
    }, [result, onResultChange]);

    return (
      <div className="number-grid-serial-input">
        <div className="number-grid-field">
          <label>Serial numbers ({parsed.length} / {expectedQuantity || '—'}) *</label>
          <textarea
            ref={(el) => {
              if (typeof ref === 'function') ref(el);
              else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }}
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
            placeholder="Enter or paste one serial per line, or comma, tab, semicolon separated"
            rows={6}
            className="number-grid-textarea"
          />
        </div>
        {parsed.length > 0 && (
          <div className="number-grid-serial-list">
            <div className="number-grid-serial-list-header"># | Serial | Status</div>
            {parsed.map((s, i) => {
              const { status } = getRowStatus(i);
              return (
                <div key={`${i}-${s}`} className={`number-grid-serial-row status-${status.toLowerCase()}`}>
                  <span className="num">{i + 1}</span>
                  <span className="serial">{s}</span>
                  <span className="status">{serialStatusToLabel(status)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
SerialInputView.displayName = 'SerialInputView';
