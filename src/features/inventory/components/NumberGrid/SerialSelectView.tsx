/**
 * SerialSelectView - SERIAL + SELECT: availableSerials, search, multi-select, derivedQuantity from selected count.
 */

import React, { useState, useMemo, useEffect, forwardRef } from 'react';
import { Input } from '@/shared/components/ui';
import type { SerialResponse } from '@/services/inventory.service';
import type { NumberGridResult } from './NumberGrid';
import type { ValidationError } from '../../utils/numberGridUtils';

export interface SerialSelectViewProps {
  expectedQuantity: number;
  availableSerials: SerialResponse[];
  initialSelected: string[];
  allowOverReceive: boolean;
  allowPartial: boolean;
  onResultChange: (r: NumberGridResult) => void;
}

export const SerialSelectView = forwardRef<HTMLInputElement | null, SerialSelectViewProps>(
  (
    {
      expectedQuantity,
      availableSerials,
      initialSelected,
      allowOverReceive,
      allowPartial,
      onResultChange,
    },
    ref
  ) => {
    const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set(initialSelected.map((s) => s.toUpperCase())));
    const [searchFilter, setSearchFilter] = useState('');

    useEffect(() => {
      setSelectedSet(new Set(initialSelected.map((s) => s.toUpperCase())));
    }, [initialSelected.join(',')]);

    const filtered = useMemo(() => {
      const q = searchFilter.trim().toUpperCase();
      if (!q) return availableSerials;
      return availableSerials.filter((s) => s.serialNumber.toUpperCase().includes(q));
    }, [availableSerials, searchFilter]);

    const finalList = useMemo(() => Array.from(selectedSet), [selectedSet]);
    const n = finalList.length;

    const validationErrors = useMemo((): ValidationError[] => {
      const errs: ValidationError[] = [];
      if (n === 0 && expectedQuantity > 0) {
        errs.push({ type: 'global', message: 'Select at least one serial', blocking: true });
      } else if (n > 0) {
        if (!allowOverReceive && n > expectedQuantity) {
          errs.push({ type: 'global', message: `Count (${n}) must not exceed expected (${expectedQuantity})`, blocking: true });
        }
        if (!allowPartial && n < expectedQuantity) {
          errs.push({ type: 'global', message: `Count (${n}) must equal expected (${expectedQuantity})`, blocking: true });
        }
        if (!allowPartial && !allowOverReceive && n !== expectedQuantity) {
          errs.push({ type: 'global', message: `Count (${n}) must equal expected (${expectedQuantity})`, blocking: true });
        }
      }
      return errs;
    }, [n, expectedQuantity, allowOverReceive, allowPartial]);

    const result: NumberGridResult = useMemo(
      () => ({
        finalSerialList: finalList,
        finalBatchList: [],
        derivedQuantity: n,
        validationErrors,
        isValid: validationErrors.filter((e) => e.blocking).length === 0,
      }),
      [finalList, n, validationErrors]
    );

    useEffect(() => {
      onResultChange(result);
    }, [result, onResultChange]);

    const toggle = (sn: string) => {
      const u = sn.toUpperCase();
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (next.has(u)) next.delete(u);
        else next.add(u);
        return next;
      });
    };

    return (
      <div className="number-grid-serial-select">
        <div className="number-grid-field">
          <label>Search</label>
          <Input
            ref={ref}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by serial number"
          />
        </div>
        <div className="number-grid-field">
          <label>Select serials ({n} / {expectedQuantity || '—'})</label>
          <div className="number-grid-serial-select-list">
            {filtered.map((s) => {
              const u = s.serialNumber.toUpperCase();
              const checked = selectedSet.has(u);
              return (
                <label key={s.id} className="number-grid-serial-select-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s.serialNumber)}
                  />
                  <span className="serial">{s.serialNumber}</span>
                  {s.currentLocation?.code && <span className="loc">{s.currentLocation.code}</span>}
                </label>
              );
            })}
            {filtered.length === 0 && <div className="number-grid-empty">No serials available</div>}
          </div>
        </div>
      </div>
    );
  }
);
SerialSelectView.displayName = 'SerialSelectView';
