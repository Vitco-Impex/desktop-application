/**
 * Create Movement View - Full-width form with header, lines grid, and summary
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { MovementLinesGrid, type LineValidation, type StockMapEntry } from './MovementLinesGrid';
import { MovementSummaryPanel, type StockImpactEntry } from './MovementSummaryPanel';
import './CreateMovementView.css';

const NEEDS_FROM: MovementType[] = [
  MovementType.TRANSFER, MovementType.ISSUE, MovementType.DAMAGE,
  MovementType.WASTE, MovementType.LOSS, MovementType.BLOCK,
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

  // Get prefill from URL params or props
  const urlMovementType = searchParams.get('movementType') as MovementType | null;
  const urlItemId = searchParams.get('itemId');
  const urlVariantId = searchParams.get('variantId');
  const urlFromLocationId = searchParams.get('fromLocationId');
  const urlToLocationId = searchParams.get('toLocationId');

  const [header, setHeader] = useState({
    movementType: (prefillData?.movementType || urlMovementType || MovementType.RECEIPT) as MovementType,
    defaultFromLocationId: prefillData?.fromLocationId || urlFromLocationId || '',
    defaultToLocationId: prefillData?.toLocationId || urlToLocationId || '',
    reasonCode: '',
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

  useEffect(() => {
    loadItems();
    loadLocations();
    loadReasonCodes();
  }, []);

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

  const loadReasonCodes = async () => {
    try {
      const data = await inventoryService.getReasonCodes();
      setReasonCodes(data.map((rc) => ({ code: rc.code, name: rc.name })));
    } catch (err) {
      logger.error('[CreateMovementView] Failed to load reason codes', err);
      // Fallback to hardcoded if API fails
      setReasonCodes([
        { code: 'RECEIPT', name: 'Receipt' },
        { code: 'ISSUE', name: 'Issue' },
        { code: 'TRANSFER', name: 'Transfer' },
        { code: 'ADJUSTMENT', name: 'Adjustment' },
      ]);
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

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validate
      if (!header.reasonCode) {
        throw new Error('Reason code is required');
      }
      if (lines.length === 0) {
        throw new Error('At least one line is required');
      }
      if (lines.some((line) => !line.itemId || !line.quantity || line.quantity <= 0)) {
        throw new Error('All lines must have a valid item and quantity');
      }

      const request: CreateMovementBatchRequest = {
        ...header,
        defaultFromLocationId: header.defaultFromLocationId || undefined,
        defaultToLocationId: header.defaultToLocationId || undefined,
        lines: lines.map((line) => ({
          ...line,
          fromLocationId: line.fromLocationId || header.defaultFromLocationId || undefined,
          toLocationId: line.toLocationId || header.defaultToLocationId || undefined,
        })),
      };

      await inventoryService.createMovementBatch(request);
      onSuccess();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create movement');
      setError(message);
      logger.error('[CreateMovementView] Failed to create movement', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setError(null);
    setLoading(true);

    try {
      const request: CreateMovementBatchRequest = {
        ...header,
        defaultFromLocationId: header.defaultFromLocationId || undefined,
        defaultToLocationId: header.defaultToLocationId || undefined,
        requiresApproval: false, // Drafts don't require approval
        lines: lines.map((line) => ({
          ...line,
          fromLocationId: line.fromLocationId || header.defaultFromLocationId || undefined,
          toLocationId: line.toLocationId || header.defaultToLocationId || undefined,
        })),
      };

      await inventoryService.saveDraft(request);
      onSuccess();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to save draft');
      setError(message);
      logger.error('[CreateMovementView] Failed to save draft', err);
    } finally {
      setLoading(false);
    }
  };

  // Track dirty state
  useEffect(() => {
    setIsDirty(true);
  }, [lines, header]);

  // Document-level keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save as Draft
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
        return;
      }

      // Ctrl+Shift+V: Validate (focus first error)
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        // Will be handled by grid ref when implemented
        return;
      }

      // Ctrl+Enter: Submit (when not in grid)
      if (e.ctrlKey && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (gridContainerRef.current && gridContainerRef.current.contains(activeElement)) {
          // Grid will handle it
          return;
        }
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Esc: Cancel with unsaved changes warning
      if (e.key === 'Escape') {
        if (batchSerialEditorOpen !== null) {
          // Editor will handle it
          return;
        }
        if (isDirty) {
          if (window.confirm('Discard unsaved changes?')) {
            onCancel();
          }
        } else {
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchSerialEditorOpen, isDirty]);

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

  return (
    <div className="create-movement-view">
      <div className="create-movement-header-bar">
        <h2>Create Stock Movement</h2>
        <div className="header-actions">
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
                  value={header.movementType}
                  onChange={(e) => {
                    const newType = e.target.value as MovementType;
                    setHeader({
                      ...header,
                      movementType: newType,
                      defaultFromLocationId: newType === MovementType.RECEIPT ? '' : header.defaultFromLocationId,
                      defaultToLocationId: newType === MovementType.ISSUE ? '' : header.defaultToLocationId,
                    });
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
                    value={header.defaultFromLocationId}
                    onChange={(e) => setHeader({ ...header, defaultFromLocationId: e.target.value })}
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
                    value={header.defaultToLocationId}
                    onChange={(e) => setHeader({ ...header, defaultToLocationId: e.target.value })}
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
                <label>Reason *</label>
                <Select
                  value={header.reasonCode}
                  onChange={(e) => setHeader({ ...header, reasonCode: e.target.value })}
                  style={{ width: '160px' }}
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
    </div>
  );
};
