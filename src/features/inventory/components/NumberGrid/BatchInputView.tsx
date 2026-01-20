/**
 * BatchInputView - BATCH: multi-row table (batchCode, qty, mfg, exp), add/remove,
 * fetchAvailableForBatch on blur (debounced), mfg/exp when required. Quantity = sum of row quantities.
 */

import React, { useState, useMemo, useEffect, useCallback, useRef, forwardRef } from 'react';
import { Input } from '@/shared/components/ui';
import type { IndustryFlags } from '@/services/inventory.service';
import type { BatchRow, ValidationError } from '../../utils/numberGridUtils';
import type { NumberGridResult } from './NumberGrid';
import { validateBatchRowsSync, validateBatchTotalSync } from '../../utils/numberGridUtils';

const DEBOUNCE_MS = 400;

export interface BatchInputViewProps {
  expectedQuantity: number;
  initialBatchRows: BatchRow[];
  industryFlags: IndustryFlags;
  itemId: string;
  locationId?: string;
  fetchAvailableForBatch?: (itemId: string, locationId: string, batchCode: string) => Promise<number>;
  allowOverReceive: boolean;
  allowPartial: boolean;
  onResultChange: (r: NumberGridResult) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

function toBatchRow(b: BatchRow): BatchRow {
  return {
    batchCode: b.batchCode || '',
    quantity: b.quantity || 0,
    manufacturingDate: b.manufacturingDate,
    expiryDate: b.expiryDate,
  };
}

export const BatchInputView = forwardRef<HTMLInputElement | null, BatchInputViewProps>(
  (
    {
      expectedQuantity,
      initialBatchRows,
      industryFlags,
      itemId,
      locationId,
      fetchAvailableForBatch,
      allowOverReceive,
      allowPartial,
      onResultChange,
    },
    ref
  ) => {
    const [rows, setRows] = useState<BatchRow[]>(
      initialBatchRows.length > 0 ? initialBatchRows.map(toBatchRow) : [{ batchCode: '', quantity: 1, manufacturingDate: '', expiryDate: '' }]
    );
    const [rowAvailable, setRowAvailable] = useState<Record<string, number>>({});
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    const finalBatchList = useMemo(
      () => rows.filter((r) => (r.batchCode || '').trim() && (r.quantity || 0) > 0),
      [rows]
    );
    const total = useMemo(() => finalBatchList.reduce((s, r) => s + (r.quantity || 0), 0), [finalBatchList]);
    const rowErrs = useMemo(() => validateBatchRowsSync(rows, industryFlags), [rows, industryFlags]);
    const totalErrs = useMemo(
      () => validateBatchTotalSync(total, expectedQuantity, allowOverReceive, allowPartial),
      [total, expectedQuantity, allowOverReceive, allowPartial]
    );
    const availErrs = useMemo((): ValidationError[] => {
      const errs: ValidationError[] = [];
      rows.forEach((r, i) => {
        const bc = (r.batchCode || '').trim();
        if (!bc) return;
        const k = `${i}-${bc}`;
        const av = rowAvailable[k];
        if (av != null && (r.quantity || 0) > av) {
          errs.push({ type: 'row', rowIndex: i, field: 'quantity', message: `Quantity (${r.quantity}) exceeds available (${av})`, blocking: true });
        }
      });
      return errs;
    }, [rows, rowAvailable]);
    const validationErrors = useMemo(() => [...rowErrs, ...totalErrs, ...availErrs], [rowErrs, totalErrs, availErrs]);

    const result: NumberGridResult = useMemo(
      () => ({
        finalSerialList: [],
        finalBatchList: rows.filter((r) => r.batchCode && r.quantity > 0),
        derivedQuantity: total,
        validationErrors,
        isValid: validationErrors.filter((e) => e.blocking).length === 0 && total > 0,
      }),
      [rows, total, validationErrors]
    );

    useEffect(() => {
      onResultChange(result);
    }, [result, onResultChange]);

    const updateRow = useCallback((i: number, u: Partial<BatchRow>) => {
      setRows((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], ...u };
        return next;
      });
    }, []);

    const addRow = useCallback(() => {
      setRows((prev) => [...prev, { batchCode: '', quantity: 1, manufacturingDate: '', expiryDate: '' }]);
    }, []);

    const removeRow = useCallback((i: number) => {
      setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
    }, []);

    const handleBatchCodeBlur = useCallback(
      (i: number) => {
        const r = rows[i];
        const bc = (r?.batchCode || '').trim();
        if (!bc || !fetchAvailableForBatch || !itemId || !locationId) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const myI = i;
        const myBc = bc;
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          fetchAvailableForBatch(itemId, locationId, myBc)
            .then((avail) => {
              if (!mountedRef.current) return;
              setRowAvailable((prev) => ({ ...prev, [`${myI}-${myBc}`]: avail }));
            })
            .catch(() => {});
        }, DEBOUNCE_MS);
      },
      [rows, fetchAvailableForBatch, itemId, locationId]
    );

    const requiresMfg = industryFlags.requiresBatchTracking || false;
    const requiresExpiry = industryFlags.hasExpiryDate || false;

    return (
      <div className="number-grid-batch">
        <div className="batch-table-container">
          <table className="batch-table">
            <thead>
              <tr>
                <th>Batch code *</th>
                <th>Qty *</th>
                {requiresMfg && <th>MFG date</th>}
                {requiresExpiry && <th>Expiry date</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <Input
                      ref={
                        i === 0
                          ? (el) => {
                              if (typeof ref === 'function') ref(el);
                              else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
                            }
                          : undefined
                      }
                      value={r.batchCode}
                      onChange={(e) => updateRow(i, { batchCode: e.target.value })}
                      onBlur={() => handleBatchCodeBlur(i)}
                      placeholder="e.g. BATCH-001"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={0.01}
                      step={1}
                      value={r.quantity || ''}
                      onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  {requiresMfg && (
                    <td>
                      <Input
                        type="date"
                        value={r.manufacturingDate || ''}
                        onChange={(e) => updateRow(i, { manufacturingDate: e.target.value })}
                        max={today()}
                      />
                    </td>
                  )}
                  {requiresExpiry && (
                    <td>
                      <Input
                        type="date"
                        value={r.expiryDate || ''}
                        onChange={(e) => updateRow(i, { expiryDate: e.target.value })}
                        min={r.manufacturingDate || undefined}
                      />
                    </td>
                  )}
                  <td>
                    <button
                      type="button"
                      className="batch-row-remove"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={requiresMfg && requiresExpiry ? 2 : 1}>Total</td>
                <td>{total}</td>
                {requiresMfg && <td></td>}
                {requiresExpiry && <td></td>}
                <td></td>
              </tr>
            </tfoot>
          </table>
          <button type="button" className="batch-add-row" onClick={addRow}>
            + Add row
          </button>
        </div>
      </div>
    );
  }
);
BatchInputView.displayName = 'BatchInputView';
