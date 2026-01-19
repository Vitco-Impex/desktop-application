/**
 * Movement Lines Grid - Editable spreadsheet-style table
 */

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MovementLineRequest, MovementType, InventoryItem, Location } from '@/services/inventory.service';
import { Button, Input, Select } from '@/shared/components/ui';
import { BatchSerialEditor, type BatchSerialMode, type BatchSerialValues } from './BatchSerialEditor';
import './MovementLinesGrid.css';

export interface MovementLinesGridHandle {
  focusErrorLineNext: (fromRow: number) => void;
}

export interface LineValidation {
  status: 'valid' | 'warning' | 'error';
  messages: string[];
}

export interface StockMapEntry {
  available: number;
  reserved?: number;
  blocked?: number;
}

interface MovementLinesGridProps {
  lines: MovementLineRequest[];
  onChange: (lines: MovementLineRequest[]) => void;
  items: InventoryItem[];
  locations: Location[];
  defaultFromLocationId?: string;
  defaultToLocationId?: string;
  movementType: MovementType;
  stockMap?: Record<string, StockMapEntry>;
  lineValidations?: Record<number, LineValidation>;
  fetchAvailableForBatch?: (itemId: string, locationId: string, batchNumber: string) => Promise<number>;
  onBatchSerialOpenChange?: (index: number | null) => void;
}

export const MovementLinesGrid = forwardRef<MovementLinesGridHandle, MovementLinesGridProps>(({
  lines,
  onChange,
  items,
  locations,
  defaultFromLocationId,
  defaultToLocationId,
  movementType,
  stockMap = {},
  lineValidations = {},
  fetchAvailableForBatch,
  onBatchSerialOpenChange,
}, ref) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [batchSerialLineIndex, setBatchSerialLineIndex] = useState<number | null>(null);
  const [reconciledHintForLine, setReconciledHintForLine] = useState<Record<number, boolean>>({});
  const reconciledHintTimeouts = useRef<Record<number, NodeJS.Timeout>>({});
  const [focusedRow, setFocusedRow] = useState<number>(0);
  const [focusedCol, setFocusedCol] = useState<number>(1);
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>>({});
  const selectRefs = useRef<Record<string, HTMLSelectElement | null>>({});

  const addLine = () => {
    onChange([
      ...lines,
      {
        itemId: '',
        quantity: 1,
        unitOfMeasure: 'pcs',
      },
    ]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
    const newSelected = new Set(selectedRows);
    newSelected.delete(index);
    setSelectedRows(newSelected);
  };

  const duplicateLine = (index: number) => {
    const lineToDuplicate = lines[index];
    const newLines = [...lines];
    newLines.splice(index + 1, 0, {
      ...lineToDuplicate,
      quantity: 1,
      batchNumber: undefined,
      manufacturingDate: undefined,
      expiryDate: undefined,
      serialNumbers: undefined,
    });
    onChange(newLines);
  };

  const updateLine = (index: number, updates: Partial<MovementLineRequest>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    onChange(newLines);
    // Clear reconciled hint when quantity is manually edited
    if (updates.quantity !== undefined && reconciledHintForLine[index]) {
      clearReconciledHint(index);
    }
  };

  const clearReconciledHint = (index: number) => {
    if (reconciledHintTimeouts.current[index]) {
      clearTimeout(reconciledHintTimeouts.current[index]);
      delete reconciledHintTimeouts.current[index];
    }
    setReconciledHintForLine((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const setReconciledHint = (index: number) => {
    clearReconciledHint(index);
    setReconciledHintForLine((prev) => ({ ...prev, [index]: true }));
    reconciledHintTimeouts.current[index] = setTimeout(() => {
      clearReconciledHint(index);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      Object.values(reconciledHintTimeouts.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Sync Select refs after render
  useEffect(() => {
    lines.forEach((_, rowIndex) => {
      [1, 3, 4].forEach((colIndex) => {
        if ((colIndex === 1) || (colIndex === 3 && needsFromLocation(movementType)) || (colIndex === 4 && needsToLocation(movementType))) {
          const selectEl = document.querySelector(`select[data-row="${rowIndex}"][data-col="${colIndex}"]`) as HTMLSelectElement | null;
          if (selectEl) {
            const key = `r-${rowIndex}-c-${colIndex}`;
            cellRefs.current[key] = selectEl;
            selectRefs.current[key] = selectEl;
          }
        }
      });
    });
  }, [lines, movementType]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const rows = pastedText.split('\n').filter((row) => row.trim());
    
    const newLines: MovementLineRequest[] = [];
    for (const row of rows) {
      const cols = row.split('\t').map((col) => col.trim());
      if (cols.length >= 2) {
        const sku = cols[0];
        const qty = parseFloat(cols[1]) || 1;
        const item = items.find((i) => i.sku.toLowerCase() === sku.toLowerCase());
        if (item) {
          newLines.push({
            itemId: item.id,
            quantity: qty,
            unitOfMeasure: item.unitOfMeasure,
            fromLocationId: cols[2] ? locations.find((l) => l.code === cols[2])?.id : defaultFromLocationId,
            toLocationId: cols[3] ? locations.find((l) => l.code === cols[3])?.id : defaultToLocationId,
          });
        }
      }
    }
    
    if (newLines.length > 0) {
      onChange([...lines, ...newLines]);
    }
  };

  const getSelectedItem = (itemId: string) => {
    return items.find((item) => item.id === itemId);
  };

  const needsFromLocation = (type: MovementType) => {
    return [
      MovementType.TRANSFER,
      MovementType.ISSUE,
      MovementType.DAMAGE,
      MovementType.WASTE,
      MovementType.LOSS,
      MovementType.BLOCK,
    ].includes(type);
  };

  const needsToLocation = (type: MovementType) => {
    return [
      MovementType.RECEIPT,
      MovementType.TRANSFER,
      MovementType.ADJUSTMENT,
    ].includes(type);
  };

  const getEffectiveFromId = (line: MovementLineRequest) =>
    line.fromLocationId || defaultFromLocationId || '';
  const getStockKey = (line: MovementLineRequest) =>
    `${line.itemId || ''}|${getEffectiveFromId(line)}`;

  const getBatchSerialSummary = (line: MovementLineRequest, item: InventoryItem | undefined): string => {
    if (!item) return '-';
    if (line.batchNumber) {
      const p = [`B: ${line.batchNumber}`];
      if (line.expiryDate) p.push(`exp ${line.expiryDate.slice(0, 7)}`);
      return p.join(', ');
    }
    if (line.serialNumbers && line.serialNumbers.length > 0) {
      return `S: ${line.serialNumbers.length} serials`;
    }
    if (item?.industryFlags?.requiresBatchTracking || item?.industryFlags?.requiresSerialTracking) {
      return '— Click to enter';
    }
    return '-';
  };

  const getBatchSerialMode = (item: InventoryItem | undefined): BatchSerialMode | null => {
    if (!item?.industryFlags) return null;
    if (item.industryFlags.requiresBatchTracking) return 'batch';
    if (item.industryFlags.requiresSerialTracking) return 'serial';
    return null;
  };

  const val = (idx: number) => lineValidations[idx] ?? { status: 'valid' as const, messages: [] };

  // Compute focusable columns for current movement type
  const getFocusableColumns = (): number[] => {
    const cols: number[] = [0]; // Checkbox
    cols.push(1); // Item
    cols.push(2); // Variant (read-only but focusable)
    if (needsFromLocation(movementType)) cols.push(3); // From Location
    if (needsToLocation(movementType)) cols.push(4); // To Location
    // Skip 5: Available (read-only)
    cols.push(6); // Quantity
    // Skip 7: UoM (read-only)
    cols.push(8); // Batch/Serial
    cols.push(9); // Line Reason
    cols.push(10); // Status
    cols.push(11); // Actions
    return cols;
  };

  const focusableColumns = getFocusableColumns();

  const getCellKey = (row: number, col: number): string => `r-${row}-c-${col}`;

  const focusCell = (row: number, col: number) => {
    const key = getCellKey(row, col);
    let cell = cellRefs.current[key];
    
    // For Select components, try to get from selectRefs or find via querySelector
    if (!cell && selectRefs.current[key]) {
      cell = selectRefs.current[key];
    }
    
    if (cell) {
      cell.focus();
      setFocusedRow(row);
      setFocusedCol(col);
    } else {
      // If cell not found, try next focusable
      const idx = focusableColumns.indexOf(col);
      if (idx >= 0 && idx < focusableColumns.length - 1) {
        focusCell(row, focusableColumns[idx + 1]);
      }
    }
  };

  const getNextFocusableCol = (currentCol: number, direction: 'next' | 'prev'): number | null => {
    const idx = focusableColumns.indexOf(currentCol);
    if (idx < 0) return focusableColumns[0] ?? null;
    if (direction === 'next') {
      return idx < focusableColumns.length - 1 ? focusableColumns[idx + 1] : null;
    } else {
      return idx > 0 ? focusableColumns[idx - 1] : null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (batchSerialLineIndex !== null) return; // Don't handle when editor is open

    // Tab / Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = getNextFocusableCol(colIndex, e.shiftKey ? 'prev' : 'next');
      if (nextCol !== null) {
        focusCell(rowIndex, nextCol);
      } else if (!e.shiftKey) {
        // Last cell, move to next row
        if (rowIndex < lines.length - 1) {
          focusCell(rowIndex + 1, focusableColumns[0]);
        }
      } else {
        // First cell, move to previous row
        if (rowIndex > 0) {
          focusCell(rowIndex - 1, focusableColumns[focusableColumns.length - 1]);
        }
      }
      return;
    }

    // Enter: next editable in same row
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const nextCol = getNextFocusableCol(colIndex, 'next');
      if (nextCol !== null) {
        focusCell(rowIndex, nextCol);
      } else {
        // Wrap to first
        focusCell(rowIndex, focusableColumns[0]);
      }
      return;
    }

    // Arrow keys
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, colIndex);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < lines.length - 1) {
        focusCell(rowIndex + 1, colIndex);
      } else {
        // Add new line and focus it
        addLine();
        setTimeout(() => focusCell(lines.length, colIndex), 0);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevCol = getNextFocusableCol(colIndex, 'prev');
      if (prevCol !== null) focusCell(rowIndex, prevCol);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = getNextFocusableCol(colIndex, 'next');
      if (nextCol !== null) focusCell(rowIndex, nextCol);
      return;
    }

    // Line shortcuts
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      addLine();
      setTimeout(() => focusCell(lines.length, 1), 0); // Focus Item
      return;
    }

    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      e.stopPropagation();
      const lineToDuplicate = lines[rowIndex];
      const newLines = [...lines];
      newLines.splice(rowIndex + 1, 0, {
        ...lineToDuplicate,
        quantity: 1,
        batchNumber: undefined,
        manufacturingDate: undefined,
        expiryDate: undefined,
        serialNumbers: undefined,
      });
      onChange(newLines);
      setTimeout(() => focusCell(rowIndex + 1, 1), 0);
      return;
    }

    if (e.ctrlKey && e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      const line = lines[rowIndex];
      const hasData = line.itemId || (line.quantity && line.quantity > 0) || line.batchNumber || (line.serialNumbers && line.serialNumbers.length > 0);
      if (hasData && !window.confirm('Remove line with data?')) {
        return;
      }
      removeLine(rowIndex);
      const newRowIndex = rowIndex >= lines.length - 1 ? Math.max(0, rowIndex - 1) : rowIndex;
      setTimeout(() => focusCell(newRowIndex, 1), 0);
      return;
    }

    if (e.altKey && e.key === 'b') {
      e.preventDefault();
      e.stopPropagation();
      const item = getSelectedItem(lines[rowIndex]?.itemId ?? '');
      const mode = getBatchSerialMode(item);
      if (mode) {
        setBatchSerialLineIndex(rowIndex);
        onBatchSerialOpenChange?.(rowIndex);
      }
      return;
    }

    if (e.altKey && e.key === 'r') {
      e.preventDefault();
      e.stopPropagation();
      focusCell(rowIndex, 9); // Line Reason
      return;
    }

    if (e.altKey && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
      focusCell(rowIndex, 10); // Status
      return;
    }

    // F2: focus next error line
    if (e.key === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      focusErrorLineNext(rowIndex);
      return;
    }
  };

  const focusErrorLineNext = (fromRow: number) => {
    let nextRow = fromRow + 1;
    while (nextRow < lines.length) {
      const validation = lineValidations[nextRow];
      if (validation?.status === 'error') {
        focusCell(nextRow, 1); // Focus Item (first focusable)
        return;
      }
      nextRow++;
    }
    // Wrap from start
    for (let i = 0; i <= fromRow; i++) {
      const validation = lineValidations[i];
      if (validation?.status === 'error') {
        focusCell(i, 1);
        return;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    focusErrorLineNext: (fromRow: number) => {
      focusErrorLineNext(fromRow);
    },
  }));

  const val = (idx: number) => lineValidations[idx] ?? { status: 'valid' as const, messages: [] };

  return (
    <div className="movement-lines-grid">
      <div className="lines-grid-toolbar">
        <Button variant="ghost" size="sm" onClick={addLine}>
          + Add New Item
        </Button>
        {selectedRows.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(lines.filter((_, i) => !selectedRows.has(i)));
              setSelectedRows(new Set());
            }}
          >
            Delete Selected ({selectedRows.size})
          </Button>
        )}
      </div>

      <div className="lines-grid-container" onPaste={handlePaste}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedRows.size === lines.length && lines.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(lines.map((_, i) => i)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </th>
              <th>Item *</th>
              <th>Variant</th>
              {needsFromLocation(movementType) && <th>From Location</th>}
              {needsToLocation(movementType) && <th>To Location</th>}
              {needsFromLocation(movementType) && <th>Available</th>}
              <th>Quantity *</th>
              <th>UoM</th>
              <th>Batch/Serial</th>
              <th>Line Reason</th>
              <th style={{ width: '36px' }}>Status</th>
              <th style={{ width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const item = getSelectedItem(line.itemId);
              const isFocusedRow = focusedRow === index;
              return (
                <tr key={index} className={isFocusedRow ? 'focused-row' : ''}>
                  <td>
                    <input
                      ref={(el) => {
                        cellRefs.current[getCellKey(index, 0)] = el;
                      }}
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRows);
                        if (e.target.checked) {
                          newSelected.add(index);
                        } else {
                          newSelected.delete(index);
                        }
                        setSelectedRows(newSelected);
                      }}
                      onFocus={() => {
                        setFocusedRow(index);
                        setFocusedCol(0);
                      }}
                      data-row={index}
                      data-col={0}
                    />
                  </td>
                  <td>
                    <div
                      ref={(el) => {
                        if (el) {
                          const selectEl = el.querySelector('select') as HTMLSelectElement | null;
                          if (selectEl) {
                            cellRefs.current[getCellKey(index, 1)] = selectEl;
                            selectRefs.current[getCellKey(index, 1)] = selectEl;
                          }
                        }
                      }}
                    >
                      <Select
                        value={line.itemId}
                        onChange={(e) => {
                          const selectedItem = items.find((i) => i.id === e.target.value);
                          updateLine(index, {
                            itemId: e.target.value,
                            unitOfMeasure: selectedItem?.unitOfMeasure || 'pcs',
                          });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index, 1)}
                        onFocus={() => {
                          setFocusedRow(index);
                          setFocusedCol(1);
                        }}
                        style={{ width: '200px' }}
                        data-row={index}
                        data-col={1}
                      >
                        <option value="">Select Item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                  <td>
                    {/* TODO: Variant selector */}
                    <span>-</span>
                  </td>
                  {needsFromLocation(movementType) && (
                    <td>
                      <div
                        ref={(el) => {
                          const selectEl = el?.querySelector('select') as HTMLSelectElement | null;
                          cellRefs.current[getCellKey(index, 3)] = selectEl;
                          selectRefs.current[getCellKey(index, 3)] = selectEl;
                        }}
                      >
                        <Select
                          value={line.fromLocationId || defaultFromLocationId || ''}
                          onChange={(e) => updateLine(index, { fromLocationId: e.target.value || undefined })}
                          onKeyDown={(e) => handleKeyDown(e, index, 3)}
                          onFocus={() => {
                            setFocusedRow(index);
                            setFocusedCol(3);
                          }}
                          style={{ width: '150px' }}
                          data-row={index}
                          data-col={3}
                        >
                          <option value="">Use Default</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.code}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                  )}
                  {needsToLocation(movementType) && (
                    <td>
                      <div
                        ref={(el) => {
                          const selectEl = el?.querySelector('select') as HTMLSelectElement | null;
                          cellRefs.current[getCellKey(index, 4)] = selectEl;
                          selectRefs.current[getCellKey(index, 4)] = selectEl;
                        }}
                      >
                        <Select
                          value={line.toLocationId || defaultToLocationId || ''}
                          onChange={(e) => updateLine(index, { toLocationId: e.target.value || undefined })}
                          onKeyDown={(e) => handleKeyDown(e, index, 4)}
                          onFocus={() => {
                            setFocusedRow(index);
                            setFocusedCol(4);
                          }}
                          style={{ width: '150px' }}
                          data-row={index}
                          data-col={4}
                        >
                          <option value="">Use Default</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.code}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                  )}
                  {needsFromLocation(movementType) && (
                    <td className="available-qty-cell">
                      {line.itemId && getEffectiveFromId(line) ? (() => {
                        const s = stockMap[getStockKey(line)];
                        if (s == null) return <span className="available-loading">…</span>;
                        const opt = [s.reserved, s.blocked].filter((n) => n != null && n > 0);
                        return (
                          <span title={opt.length ? `Reserved: ${s.reserved ?? 0}, Blocked: ${s.blocked ?? 0}` : undefined}>
                            {s.available}
                            {opt.length ? ` (R:${s.reserved ?? 0} B:${s.blocked ?? 0})` : ''}
                          </span>
                        );
                      })() : <span>-</span>}
                    </td>
                  )}
                  <td>
                    <Input
                      type="number"
                      value={line.quantity || ''}
                      onChange={(e) => updateLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                      min="0.01"
                      step="0.01"
                      style={{ width: '100px' }}
                    />
                  </td>
                  <td>
                    <Input
                      value={line.unitOfMeasure || 'pcs'}
                      readOnly
                      style={{ width: '80px' }}
                    />
                  </td>
                  <td className="batch-serial-cell">
                    {(() => {
                      const mode = getBatchSerialMode(item);
                      if (!mode) return <span>-</span>;
                      const summary = getBatchSerialSummary(line, item);
                      return (
                        <button
                          type="button"
                          className="batch-serial-trigger"
                          onClick={() => {
                            setBatchSerialLineIndex(index);
                            onBatchSerialOpenChange?.(index);
                          }}
                        >
                          {summary}
                        </button>
                      );
                    })()}
                  </td>
                  <td>
                    <Input
                      value={line.lineReasonCode || ''}
                      onChange={(e) => updateLine(index, { lineReasonCode: e.target.value || undefined })}
                      placeholder="Override reason"
                      style={{ width: '120px' }}
                    />
                  </td>
                  <td className="status-cell" title={val(index).messages.join('; ') || 'Valid'}>
                    <span className={`status-dot status-${val(index).status}`} aria-label={val(index).messages[0] || val(index).status} />
                  </td>
                  <td>
                    <div className="line-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateLine(index)}
                        title="Duplicate"
                      >
                        📋
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        title="Remove"
                      >
                        ×
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lines.length === 0 && (
          <div className="empty-lines-message">
            <p>No lines added yet. Click "Add New Item" to start.</p>
            <p className="hint">Tip: Paste from Excel (SKU, Qty, From, To) to add multiple lines at once.</p>
          </div>
        )}
      </div>

      {batchSerialLineIndex != null && (() => {
        const idx = batchSerialLineIndex;
        const ln = lines[idx];
        const it = getSelectedItem(ln?.itemId ?? '');
        const mode = getBatchSerialMode(it);
        if (!ln || !it || !mode) return null;
        
        // Compute existing serials from other lines
        const existingSerials = lines
          .flatMap((l, j) => (j === idx ? [] : l.serialNumbers ?? []))
          .filter(Boolean);
        
        const fromLocId = getEffectiveFromId(ln);
        
        return (
          <BatchSerialEditor
            mode={mode}
            lineQuantity={ln.quantity || 0}
            industryFlags={(it.industryFlags ?? {}) as import('@/services/inventory.service').IndustryFlags}
            initial={{
              batchNumber: ln.batchNumber,
              manufacturingDate: ln.manufacturingDate,
              expiryDate: ln.expiryDate,
              serialNumbers: ln.serialNumbers,
            }}
            itemId={ln.itemId}
            fromLocationId={fromLocId || undefined}
            fetchAvailableForBatch={fetchAvailableForBatch}
            existingSerials={existingSerials}
            onSave={(v: BatchSerialValues) => {
              const oldQty = ln.quantity || 0;
              const newQty = v.quantity ?? (mode === 'serial' ? v.serialNumbers?.length ?? 0 : oldQty);
              
              if (mode === 'batch' && v.batchRows) {
                // Coalesce to first row for backend
                updateLine(idx, {
                  batchNumber: v.batchRows[0]?.batchNumber,
                  manufacturingDate: v.batchRows[0]?.manufacturingDate,
                  expiryDate: v.batchRows[0]?.expiryDate,
                  quantity: newQty,
                });
              } else if (mode === 'serial' && v.serialNumbers) {
                updateLine(idx, {
                  serialNumbers: v.serialNumbers,
                  quantity: newQty,
                });
              } else {
                // Fallback for backward compat
                updateLine(idx, {
                  batchNumber: v.batchNumber,
                  manufacturingDate: v.manufacturingDate,
                  expiryDate: v.expiryDate,
                  serialNumbers: v.serialNumbers,
                  quantity: newQty,
                });
              }
              
              if (oldQty !== newQty) {
                setReconciledHint(idx);
              }
              
              setBatchSerialLineIndex(null);
              onBatchSerialOpenChange?.(null);
            }}
            onClose={() => {
              setBatchSerialLineIndex(null);
              onBatchSerialOpenChange?.(null);
            }}
          />
        );
      })()}
    </div>
  );
});

MovementLinesGrid.displayName = 'MovementLinesGrid';
