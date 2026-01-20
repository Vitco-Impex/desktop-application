/**
 * NumberGrid utilities: parsing, sync validation, and mode resolution.
 * Pure functions; no React or async.
 */

import { MovementType, type IndustryFlags } from '@/services/inventory.service';

export interface BatchRow {
  batchCode: string;
  quantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
}

export interface ValidationError {
  type: 'row' | 'global';
  rowIndex?: number;
  field?: string;
  message: string;
  blocking: boolean;
}

/**
 * Parse serial input: split on newlines, commas, tabs, semicolons; trim; filter empty.
 */
export function parseSerialInput(text: string): string[] {
  return text
    .split(/[\n,\t;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Return duplicate serials in array (O(n) with Set).
 */
export function getDuplicateSerials(arr: string[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const s of arr) {
    if (seen.has(s)) dupes.push(s);
    else seen.add(s);
  }
  return [...new Set(dupes)];
}

/**
 * Sync validation for serial list: empty, duplicate, duplicate-in-doc, count vs expected.
 */
export function validateSerialsSync(
  serials: string[],
  expected: number,
  existingInDoc: string[],
  allowOver: boolean,
  allowPartial: boolean
): ValidationError[] {
  const errs: ValidationError[] = [];
  const docSet = new Set(existingInDoc.map((s) => s.toUpperCase()));

  const dupes = getDuplicateSerials(serials);
  if (dupes.length > 0) {
    errs.push({
      type: 'global',
      message: `Duplicate serials: ${dupes.slice(0, 5).join(', ')}${dupes.length > 5 ? '…' : ''}`,
      blocking: true,
    });
  }

  const inDoc = serials.filter((s) => docSet.has(s.toUpperCase()));
  if (inDoc.length > 0) {
    errs.push({
      type: 'global',
      message: `Duplicate serials in other lines: ${inDoc.slice(0, 5).join(', ')}${inDoc.length > 5 ? '…' : ''}`,
      blocking: true,
    });
  }

  const n = serials.length;
  if (n === 0 && expected > 0) {
    errs.push({ type: 'global', message: 'At least one serial is required', blocking: true });
  } else if (n > 0) {
    if (!allowOver && n > expected) {
      errs.push({ type: 'global', message: `Count (${n}) must not exceed expected (${expected})`, blocking: true });
    }
    if (!allowPartial && n < expected) {
      errs.push({ type: 'global', message: `Count (${n}) must equal expected (${expected})`, blocking: true });
    }
    if (allowPartial && allowOver) {
      // both: any count ok
    } else if (!allowPartial && !allowOver && n !== expected) {
      errs.push({ type: 'global', message: `Count (${n}) must equal expected (${expected})`, blocking: true });
    }
  }

  return errs;
}

/**
 * Sync validation for batch rows: empty batchCode, qty <= 0, mfg/expiry when required, mfg > today, expiry < today.
 */
export function validateBatchRowsSync(
  rows: BatchRow[],
  industryFlags: IndustryFlags
): ValidationError[] {
  const errs: ValidationError[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const requiresMfg = industryFlags.requiresBatchTracking || false;
  const requiresExpiry = industryFlags.hasExpiryDate || false;

  rows.forEach((r, i) => {
    if (!r.batchCode || !String(r.batchCode).trim()) {
      errs.push({ type: 'row', rowIndex: i, field: 'batchCode', message: 'Batch code is required', blocking: true });
    }
    if (r.quantity == null || r.quantity <= 0) {
      errs.push({ type: 'row', rowIndex: i, field: 'quantity', message: 'Quantity must be greater than 0', blocking: true });
    }
    if (requiresMfg && (!r.manufacturingDate || !r.manufacturingDate.trim())) {
      errs.push({ type: 'row', rowIndex: i, field: 'manufacturingDate', message: 'MFG date is required', blocking: true });
    }
    if (r.manufacturingDate && r.manufacturingDate > today) {
      errs.push({ type: 'row', rowIndex: i, field: 'manufacturingDate', message: 'MFG date cannot be in the future', blocking: true });
    }
    if (requiresExpiry && (!r.expiryDate || !r.expiryDate.trim())) {
      errs.push({ type: 'row', rowIndex: i, field: 'expiryDate', message: 'Expiry date is required', blocking: true });
    }
    if (r.expiryDate && r.expiryDate < today) {
      errs.push({ type: 'row', rowIndex: i, field: 'expiryDate', message: 'Expiry date cannot be in the past', blocking: true });
    }
  });

  return errs;
}

/**
 * Sync validation for batch total vs expected.
 */
export function validateBatchTotalSync(
  total: number,
  expected: number,
  allowOver: boolean,
  allowPartial: boolean
): ValidationError[] {
  const errs: ValidationError[] = [];
  if (total <= 0 && expected > 0) {
    errs.push({ type: 'global', message: 'Total batch quantity must be greater than 0', blocking: true });
    return errs;
  }
  if (total > 0) {
    if (!allowOver && total > expected) {
      errs.push({ type: 'global', message: `Total (${total}) must not exceed expected (${expected})`, blocking: true });
    }
    if (!allowPartial && total < expected) {
      errs.push({ type: 'global', message: `Total (${total}) must equal expected (${expected})`, blocking: true });
    }
    if (!allowPartial && !allowOver && total !== expected) {
      errs.push({ type: 'global', message: `Total (${total}) must equal expected (${expected})`, blocking: true });
    }
  }
  return errs;
}

export type NumberGridInputMode = 'INPUT' | 'SELECT';
export type SerialStatusFilter = 'AVAILABLE' | 'BLOCKED';

export interface GetNumberGridModeResult {
  mode: NumberGridInputMode;
  serialStatus?: SerialStatusFilter;
}

/**
 * Entry mode by movement type (industry-standard ERP rules).
 * - RECEIPT: INPUT (textarea/scanner; new serials allowed).
 * - ADJUSTMENT: INPUT (new serials allowed; NOT_FOUND → New).
 * - BLOCK: INPUT (policy-based; serial must exist at source).
 * - ISSUE, TRANSFER: SELECT only (must choose from available pool).
 * - REVERSAL, UNBLOCK: SELECT only.
 * - DAMAGE, WASTE, LOSS: SELECT only (must choose from source).
 * Parent must provide locationId when mode is SELECT.
 */
export function getNumberGridMode(
  movementType: MovementType,
  _quantity: number
): GetNumberGridModeResult {
  switch (movementType) {
    case MovementType.RECEIPT:
      return { mode: 'INPUT' };
    case MovementType.ADJUSTMENT:
    case MovementType.COUNT_ADJUSTMENT:
      return { mode: 'INPUT' };
    case MovementType.BLOCK:
      return { mode: 'INPUT' };
    case MovementType.ISSUE:
    case MovementType.TRANSFER:
      return { mode: 'SELECT', serialStatus: 'AVAILABLE' };
    case MovementType.REVERSAL:
      return { mode: 'SELECT', serialStatus: 'AVAILABLE' };
    case MovementType.UNBLOCK:
      return { mode: 'SELECT', serialStatus: 'BLOCKED' };
    case MovementType.DAMAGE:
    case MovementType.WASTE:
    case MovementType.LOSS:
      return { mode: 'SELECT', serialStatus: 'AVAILABLE' };
    default:
      return { mode: 'INPUT' };
  }
}

/** Backend-verified serial status. Never show "valid" unless API confirmed. */
export type SerialValidationStatus =
  | 'CHECKING'
  | 'VALID'
  | 'NEW'
  | 'NOT_FOUND'
  | 'NOT_IN_LOCATION'
  | 'BLOCKED'
  | 'USED'
  | 'ALREADY_EXISTS'
  | 'DUPLICATE';

export interface SerialValidationItem {
  serialNumber: string;
  status: SerialValidationStatus;
  message?: string;
  allowForMovementType: boolean;
}

/** True if status blocks Apply. */
export function isBlockingSerialStatus(s: SerialValidationStatus): boolean {
  return ['NOT_FOUND', 'NOT_IN_LOCATION', 'BLOCKED', 'USED', 'ALREADY_EXISTS', 'DUPLICATE'].includes(s);
}

/** Status to display label (ERP semantics). Never show "valid" unless backend confirmed. */
export function serialStatusToLabel(s: SerialValidationStatus): string {
  const map: Record<SerialValidationStatus, string> = {
    CHECKING: '⏳ Checking',
    VALID: '✅ Valid',
    NEW: '🟦 New',
    NOT_FOUND: '❌ Not Found',
    NOT_IN_LOCATION: '⚠ Wrong Location',
    BLOCKED: '🔒 Blocked',
    USED: '♻ Already Used',
    ALREADY_EXISTS: '❌ Exists',
    DUPLICATE: '❌ Duplicate',
  };
  return map[s] || s;
}
