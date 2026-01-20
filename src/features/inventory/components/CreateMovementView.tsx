/**
 * Create Movement View - Full-width form with header, lines grid, and summary
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  inventoryService,
  CreateMovementBatchRequest,
  MovementLineRequest,
  MovementType,
  InventoryItem,
  Location,
} from '@/services/inventory.service';
import { Button, Input, Select } from '@/shared/components/ui';
import { Modal } from '@/shared/components/modals';
import { confirmWithFocusRecovery } from '@/shared/utils/dialog';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { MovementLinesGrid, type LineValidation, type StockMapEntry, type MovementLinesGridHandle } from './MovementLinesGrid';
import { MovementSummaryPanel, type StockImpactEntry, type MovementSummaryPanelHandle } from './MovementSummaryPanel';
import './CreateMovementView.css';

const NEEDS_FROM: MovementType[] = [
  MovementType.TRANSFER, MovementType.ISSUE, MovementType.DAMAGE,
  MovementType.WASTE, MovementType.LOSS, MovementType.BLOCK,
];

const NEEDS_TO: MovementType[] = [
  MovementType.RECEIPT, MovementType.TRANSFER, MovementType.ADJUSTMENT,
];

interface CreateMovementViewProps {
  onCancel: () => void;
  onSuccess: () => void;
  prefillData?: {
    movementType?: MovementType;
    itemId?: string;
    variantId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    reasonCode?: string;
    reasonLocked?: boolean;
  };
}

export const CreateMovementView: React.FC<CreateMovementViewProps> = ({
  onCancel,
  onSuccess,
  prefillData,
}) => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reasonCodes, setReasonCodes] = useState<Array<{ code: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Get prefill from URL params or props
  const urlMovementType = searchParams.get('movementType') as MovementType | null;
  const urlItemId = searchParams.get('itemId');
  const urlVariantId = searchParams.get('variantId');
  const urlFromLocationId = searchParams.get('fromLocationId');
  const urlToLocationId = searchParams.get('toLocationId');
  const urlReasonLocked = searchParams.get('reasonLocked') === '1' || searchParams.get('reasonLocked') === 'true';
  const reasonLocked = prefillData?.reasonLocked ?? urlReasonLocked;

  const [header, setHeader] = useState({
    movementType: (prefillData?.movementType || urlMovementType || MovementType.RECEIPT) as MovementType,
    defaultFromLocationId: prefillData?.fromLocationId || urlFromLocationId || '',
    defaultToLocationId: prefillData?.toLocationId || urlToLocationId || '',
    reasonCode: prefillData?.reasonCode || '',
    reasonDescription: '',
    documentNotes: '',
    requiresApproval: false,
  });

  const [lines, setLines] = useState<MovementLineRequest[]>([
    (prefillData?.itemId || urlItemId)
      ? {
          itemId: prefillData?.itemId || urlItemId || '',
          variantId: prefillData?.variantId || urlVariantId || undefined,
          fromLocationId: prefillData?.fromLocationId || urlFromLocationId || undefined,
          toLocationId: prefillData?.toLocationId || urlToLocationId || undefined,
          quantity: 1,
          unitOfMeasure: 'pcs',
        }
      : {
          itemId: '',
          quantity: 1,
          unitOfMeasure: 'pcs',
        },
  ]);

  const [stockMap, setStockMap] = useState<Record<string, StockMapEntry>>({});
  const [locationData, setLocationData] = useState<Record<string, { before: number; maxItems?: number }>>({});
  const fetchGenRef = useRef(0);
  const [batchSerialEditorOpen, setBatchSerialEditorOpen] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<MovementLinesGridHandle>(null);
  const summaryPanelRef = useRef<MovementSummaryPanelHandle>(null);
  const typeSelectRef = useRef<HTMLSelectElement>(null);
  const fromSelectRef = useRef<HTMLSelectElement>(null);
  const toSelectRef = useRef<HTMLSelectElement>(null);
  const reasonSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    loadItems();
    loadLocations();
  }, []);

  // Load reason codes from API only (DB-valid, active). Selector shows only these; default must be in list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await inventoryService.getReasonCodesForMovementType(header.movementType);
        if (cancelled) return;
        const allowed = (data.allowed || []).map((r) => ({ code: r.code, name: r.name || r.code }));
        setReasonCodes(allowed);
        const defaultCode = (data.allowed || []).some((a) => a.code === (data.defaultCode || ''))
          ? (data.defaultCode || '')
          : (data.allowed || [])[0]?.code || '';
        setHeader((prev) => {
          if (reasonLocked) return prev;
          const inList = (data.allowed || []).some((a) => a.code === prev.reasonCode);
          if (inList && prev.reasonCode) return prev;
          return { ...prev, reasonCode: defaultCode };
        });
      } catch (err) {
        if (cancelled) return;
        logger.error('[CreateMovementView] Failed to load reason codes for movement type', err);
        setReasonCodes([]);
      }
    })();
    return () => { cancelled = true; };
  }, [header.movementType, reasonLocked]);

  const loadItems = async () => {
    try {
      const data = await inventoryService.getAllItems({ isActive: true });
      setItems(data);
    } catch (err) {
      logger.error('[CreateMovementView] Failed to load items', err);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await inventoryService.getAllLocations({ isActive: true });
      setLocations(data);
    } catch (err) {
      logger.error('[CreateMovementView] Failed to load locations', err);
    }
  };

  // Fetch stock balances and location capacity for availability and impact preview
  useEffect(() => {
    const needFrom = NEEDS_FROM.includes(header.movementType);
    const defFrom = header.defaultFromLocationId || '';
    const defTo = header.defaultToLocationId || '';

    const stockKeys: string[] = [];
    const affectedLocs = new Set<string>();
    for (const line of lines) {
      const effFrom = line.fromLocationId || defFrom;
      const effTo = line.toLocationId || defTo;
      if (effFrom) affectedLocs.add(effFrom);
      if (effTo) affectedLocs.add(effTo);
      if (needFrom && line.itemId && effFrom) stockKeys.push(`${line.itemId}|${effFrom}`);
    }
    const locIds = Array.from(affectedLocs);

    fetchGenRef.current += 1;
    const myGen = fetchGenRef.current;

    (async () => {
      try {
        const [balanceEntries, locEntries] = await Promise.all([
          Promise.all(
            [...new Set(stockKeys)].map(async (k) => {
              const [itemId, locId] = k.split('|');
              try {
                const b = await inventoryService.getStockBalance(itemId, locId);
                return [k, { available: b.available, reserved: b.reserved, blocked: b.blocked }] as const;
              } catch {
                return [k, { available: 0, reserved: 0, blocked: 0 }] as const;
              }
            })
          ),
          Promise.all(
            locIds.map(async (locId) => {
              try {
                const [byLoc, cap] = await Promise.all([
                  inventoryService.getStockByLocation(locId),
                  inventoryService.getLocationCapacityUsage(locId),
                ]);
                const before = byLoc.reduce((s, e) => s + (e.onHandQuantity || 0), 0);
                return [locId, { before, maxItems: cap.maxItems }] as const;
              } catch {
                return [locId, { before: 0, maxItems: undefined }] as const;
              }
            })
          ),
        ]);

        if (fetchGenRef.current !== myGen) return;
        setStockMap(Object.fromEntries(balanceEntries));
        setLocationData(Object.fromEntries(locEntries));
      } catch (e) {
        logger.error('[CreateMovementView] Stock/capacity fetch failed', e);
      }
    })();
  }, [lines, header.defaultFromLocationId, header.defaultToLocationId, header.movementType]);

  const fetchAvailableForBatch = useCallback(
    async (itemId: string, locationId: string, batchNumber: string): Promise<number> => {
      try {
        const b = await inventoryService.getStockBalance(itemId, locationId, batchNumber);
        return b.available ?? 0;
      } catch {
        return 0;
      }
    },
    []
  );

  const buildRequest = useCallback((): CreateMovementBatchRequest => ({
    ...header,
    defaultFromLocationId: header.defaultFromLocationId || undefined,
    defaultToLocationId: header.defaultToLocationId || undefined,
    lines: lines.map((line) => ({
      ...line,
      fromLocationId: line.fromLocationId || header.defaultFromLocationId || undefined,
      toLocationId: line.toLocationId || header.defaultToLocationId || undefined,
    })),
  }), [header, lines]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!header.reasonCode) throw new Error('Reason code is required');
      if (lines.length === 0) throw new Error('At least one line is required');
      if (lines.some((line) => !line.itemId || !line.quantity || line.quantity <= 0)) {
        throw new Error('All lines must have a valid item and quantity');
      }
      await inventoryService.createMovementBatch(buildRequest());
      onSuccess();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create movement'));
      logger.error('[CreateMovementView] Failed to create movement', err);
    } finally {
      setLoading(false);
    }
  }, [header.reasonCode, lines, buildRequest, onSuccess]);

  const handleSaveDraft = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await inventoryService.saveDraft({ ...buildRequest(), requiresApproval: false });
      onSuccess();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to save draft'));
      logger.error('[CreateMovementView] Failed to save draft', err);
    } finally {
      setLoading(false);
    }
  }, [buildRequest, onSuccess]);

  // Track dirty state
  useEffect(() => {
    setIsDirty(true);
  }, [lines, header]);

  // Esc (capture): close shortcuts modal first, then NumberGrid and form handle their own Escape
  useEffect(() => {
    const onEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shortcutsModalOpen) {
        setShortcutsModalOpen(false);
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onEscapeCapture, true);
    return () => document.removeEventListener('keydown', onEscapeCapture, true);
  }, [shortcutsModalOpen]);

  // Document-level keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save as Draft (call handler directly to avoid button/form quirks)
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!loading) handleSaveDraft();
        return;
      }

      // Ctrl+Enter: Submit (when not in grid)
      if (e.ctrlKey && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (gridContainerRef.current?.contains(activeElement)) return;
        e.preventDefault();
        summaryPanelRef.current?.clickSubmit();
        return;
      }

      // Esc: 1) Shortcuts modal → capture above. 2) NumberGrid (Batch/Serial) → Modal handles and stopPropagation. 3) Form:
      if (e.key === 'Escape') {
        if (batchSerialEditorOpen !== null) return; // NumberGrid (or similar) is open; it handles ESC, do not close form
        if (isDirty && confirmWithFocusRecovery('Discard unsaved changes?')) onCancel();
        else if (!isDirty) onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batchSerialEditorOpen, isDirty, onCancel, loading, handleSaveDraft]);

  // Focus Type select when form is first shown (not loading)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => typeSelectRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [loading]);

  const totalQuantity = lines.reduce((sum, line) => sum + Math.abs(line.quantity), 0);
  const needFrom = NEEDS_FROM.includes(header.movementType);
  const defFrom = header.defaultFromLocationId || '';
  const defTo = header.defaultToLocationId || '';
  const today = new Date().toISOString().slice(0, 10);

  // change by location (from lines)
  const changeByLoc = useMemo(() => {
    const m: Record<string, number> = {};
    for (const line of lines) {
      const qty = line.quantity || 0;
      const ef = line.fromLocationId || defFrom;
      const et = line.toLocationId || defTo;
      if (ef) m[ef] = (m[ef] ?? 0) - qty;
      if (et) m[et] = (m[et] ?? 0) + qty;
    }
    return m;
  }, [lines, defFrom, defTo]);

  // stock impact and impact errors
  const { stockImpact, impactErrors } = useMemo(() => {
    const impact: StockImpactEntry[] = [];
    const errs: string[] = [];
    for (const locId of Object.keys(changeByLoc)) {
      const ch = changeByLoc[locId];
      if (ch === 0) continue;
      const before = locationData[locId]?.before ?? 0;
      const after = before + ch;
      const maxItems = locationData[locId]?.maxItems;
      const loc = locations.find((l) => l.id === locId);
      const name = loc?.code || loc?.name || locId;
      impact.push({ locationId: locId, locationName: name, change: ch, before, after });
      if (after < 0) errs.push(`${name} would go negative (after: ${after})`);
      if (maxItems != null && after > maxItems) errs.push(`${name} would exceed capacity (${after} > ${maxItems})`);
    }
    return { stockImpact: impact, impactErrors: errs };
  }, [changeByLoc, locationData, locations]);

  // per-line validations
  const lineValidations = useMemo(() => {
    const v: Record<number, LineValidation> = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const item = items.find((it) => it.id === line.itemId);
      const msgs: string[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';
      const set = (s: 'valid' | 'warning' | 'error', m: string) => {
        msgs.push(m);
        if (s === 'error') status = 'error';
        else if (s === 'warning' && status === 'valid') status = 'warning';
      };
      if (!line.itemId) set('error', 'Item is required');
      if (!line.quantity || line.quantity <= 0) set('error', 'Invalid quantity');
      const effFrom = line.fromLocationId || defFrom;
      if (needFrom && line.itemId && effFrom) {
        const sm = stockMap[`${line.itemId}|${effFrom}`];
        if (sm != null) {
          if ((line.quantity || 0) > sm.available) set('error', `Insufficient stock (available: ${sm.available})`);
          else if ((line.quantity || 0) === sm.available) set('warning', 'Using all available stock');
        }
      }
      const fl = item?.industryFlags;
      if (fl?.requiresBatchTracking) {
        if (!line.batchNumber) set('error', 'Batch number required');
        else {
          if (fl.requiresBatchTracking && !line.manufacturingDate) set('error', 'MFG date required');
          if (fl.hasExpiryDate && !line.expiryDate) set('error', 'Expiry date required');
          if (line.expiryDate && line.expiryDate < today) set('error', 'Expiry date in the past');
          if (line.manufacturingDate && line.manufacturingDate > today) set('error', 'MFG date in the future');
        }
      }
      if (fl?.requiresSerialTracking) {
        const q = line.quantity || 0;
        if (!line.serialNumbers || line.serialNumbers.length !== q)
          set('error', `Serial count must equal quantity (${q})`);
        else if (line.serialNumbers.length !== new Set(line.serialNumbers).size) set('error', 'Duplicate serials');
      }
      v[i] = { status, messages: msgs };
    }
    return v;
  }, [lines, items, needFrom, defFrom, stockMap, today]);

  const errors: string[] = [];
  if (!header.reasonCode) errors.push('Reason code is required');
  if (lines.length === 0) errors.push('At least one line is required');
  Object.entries(lineValidations).forEach(([i, v]) => {
    if (v.status === 'error') v.messages.forEach((m) => errors.push(`Line ${Number(i) + 1}: ${m}`));
  });
  const warnings: string[] = [];
  Object.values(lineValidations).forEach((v) => {
    if (v.status === 'warning') v.messages.forEach((m) => warnings.push(m));
  });

  type HeaderField = 'type' | 'from' | 'to' | 'reason';
  const headerRefs: Record<HeaderField, React.RefObject<HTMLSelectElement | null>> = {
    type: typeSelectRef, from: fromSelectRef, to: toSelectRef, reason: reasonSelectRef,
  };
  const getHeaderFocusSequence = (): HeaderField[] => {
    const nFrom = NEEDS_FROM.includes(header.movementType);
    const nTo = NEEDS_TO.includes(header.movementType);
    return ['type', ...(nFrom ? (['from'] as const) : []), ...(nTo ? (['to'] as const) : []), 'reason'];
  };
  const moveFocusToNext = (field: HeaderField) => {
    const seq = getHeaderFocusSequence();
    const i = seq.indexOf(field);
    const target = seq[i + 1];
    if (target) {
      setTimeout(() => headerRefs[target].current?.focus(), 0);
    } else {
      gridRef.current?.focusFirstItemSelect();
    }
  };

  return (
    <div className="create-movement-view">
      <div className="create-movement-header-bar">
        <h2>Create Stock Movement</h2>
        <div className="header-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShortcutsModalOpen(true)}
            title="Keyboard shortcuts"
          >
            Shortcuts
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="create-movement-content">
        <div className="create-movement-main">
          {/* Document Header - Compact */}
          <div className="movement-header-section compact">
            <div className="header-form-row">
              <div className="form-group-inline">
                <label>Type *</label>
                <Select
                  ref={typeSelectRef}
                  value={header.movementType}
                  onChange={(e) => {
                    const newType = e.target.value as MovementType;
                    setHeader({
                      ...header,
                      movementType: newType,
                      defaultFromLocationId: newType === MovementType.RECEIPT ? '' : header.defaultFromLocationId,
                      defaultToLocationId: newType === MovementType.ISSUE ? '' : header.defaultToLocationId,
                    });
                    setTimeout(() => moveFocusToNext('type'), 0);
                  }}
                  style={{ width: '140px' }}
                >
                  {Object.values(MovementType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>

              {(header.movementType === MovementType.TRANSFER ||
                header.movementType === MovementType.ISSUE ||
                header.movementType === MovementType.DAMAGE ||
                header.movementType === MovementType.WASTE ||
                header.movementType === MovementType.LOSS ||
                header.movementType === MovementType.BLOCK) && (
                <div className="form-group-inline">
                  <label>From</label>
                  <Select
                    ref={fromSelectRef}
                    value={header.defaultFromLocationId}
                    onChange={(e) => {
                      setHeader({ ...header, defaultFromLocationId: e.target.value });
                      moveFocusToNext('from');
                    }}
                    style={{ width: '180px' }}
                  >
                    <option value="">Select...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {(header.movementType === MovementType.RECEIPT ||
                header.movementType === MovementType.TRANSFER ||
                header.movementType === MovementType.ADJUSTMENT) && (
                <div className="form-group-inline">
                  <label>To</label>
                  <Select
                    ref={toSelectRef}
                    value={header.defaultToLocationId}
                    onChange={(e) => {
                      setHeader({ ...header, defaultToLocationId: e.target.value });
                      moveFocusToNext('to');
                    }}
                    style={{ width: '180px' }}
                  >
                    <option value="">Select...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="form-group-inline">
                <label>Reason *{reasonCodes.length === 0 && <span className="label-hint" title="Initialize reason codes in Inventory → Settings"> (none)</span>}</label>
                <Select
                  ref={reasonSelectRef}
                  value={reasonCodes.some((r) => r.code === header.reasonCode) ? header.reasonCode : ''}
                  onChange={(e) => {
                    setHeader({ ...header, reasonCode: e.target.value });
                    moveFocusToNext('reason');
                  }}
                  disabled={reasonLocked}
                  style={{ width: '160px' }}
                  title={reasonCodes.length === 0 ? 'Initialize reason codes in Inventory → Settings' : undefined}
                >
                  <option value="">Select...</option>
                  {reasonCodes.map((rc) => (
                    <option key={rc.code} value={rc.code}>
                      {rc.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="form-group-inline checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={header.requiresApproval}
                    onChange={(e) => setHeader({ ...header, requiresApproval: e.target.checked })}
                  />
                  Requires Approval
                </label>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                style={{ fontSize: '11px', padding: '4px 8px', marginLeft: '8px' }}
              >
                {showOptionalFields ? '−' : '+'} More
              </Button>
            </div>

            {showOptionalFields && (
              <div className="header-optional-fields">
                <div className="form-group-inline full-width">
                  <label>Description</label>
                  <Input
                    value={header.reasonDescription}
                    onChange={(e) => setHeader({ ...header, reasonDescription: e.target.value })}
                    placeholder="Additional details (optional)"
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="form-group-inline full-width">
                  <label>Notes</label>
                  <Input
                    value={header.documentNotes}
                    onChange={(e) => setHeader({ ...header, documentNotes: e.target.value })}
                    placeholder="Internal notes (optional)"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lines Grid */}
          <div className="movement-lines-section" ref={gridContainerRef}>
            <MovementLinesGrid
              ref={gridRef}
              lines={lines}
              onChange={setLines}
              items={items}
              locations={locations}
              defaultFromLocationId={header.defaultFromLocationId}
              defaultToLocationId={header.defaultToLocationId}
              movementType={header.movementType}
              stockMap={stockMap}
              lineValidations={lineValidations}
              fetchAvailableForBatch={fetchAvailableForBatch}
              onBatchSerialOpenChange={setBatchSerialEditorOpen}
            />
          </div>
        </div>

        {/* Summary Panel */}
        <div className="create-movement-summary">
          <MovementSummaryPanel
            ref={summaryPanelRef}
            totalLines={lines.length}
            totalQuantity={totalQuantity}
            errors={errors}
            warnings={warnings}
            requiresApproval={header.requiresApproval}
            onSaveDraft={handleSaveDraft}
            onValidate={() => {}}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            loading={loading}
            stockImpact={stockImpact}
            impactErrors={impactErrors}
          />
        </div>
      </div>

      <Modal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        title="Keyboard shortcuts"
        size="md"
      >
        <div className="shortcuts-modal-content">
          <section className="shortcuts-section">
            <h4>Document</h4>
            <ul>
              <li><kbd>Ctrl</kbd>+<kbd>S</kbd> Save as Draft</li>
              <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> Validate (focus first error)</li>
              <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> Submit <span className="shortcut-hint">(when not in grid)</span></li>
              <li><kbd>Esc</kbd> Close / Cancel</li>
              <li><kbd>F2</kbd> Cycle through error lines</li>
            </ul>
          </section>
          <section className="shortcuts-section">
            <h4>Lines (in grid)</h4>
            <ul>
              <li><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> Next / previous cell</li>
              <li><kbd>Enter</kbd> Next editable cell in row</li>
              <li><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> Move between cells</li>
              <li><kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicate current line</li>
              <li><kbd>Ctrl</kbd>+<kbd>Backspace</kbd> Remove current line</li>
              <li><kbd>Alt</kbd>+<kbd>B</kbd> Open Batch/Serial editor</li>
              <li><kbd>Alt</kbd>+<kbd>R</kbd> Focus Line Reason</li>
              <li><kbd>Alt</kbd>+<kbd>S</kbd> Focus Status tooltip</li>
            </ul>
          </section>
        </div>
      </Modal>
    </div>
  );
};
