/**
 * Movement Management Component - Manage stock movements
 */

import React, { useState, useEffect } from 'react';
import {
  inventoryService,
  StockMovementResponse,
  CreateStockMovementRequest,
  MovementType,
  MovementStatus,
  InventoryItem,
  Location,
  StockCountResponse,
  CreateStockCountRequest,
} from '@/services/inventory.service';
import { Button, Input, Card, Select } from '@/shared/components/ui';
import { LoadingState, EmptyState, ErrorState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog } from '@/shared/components/modals';
import './MovementManagement.css';

type ViewMode = 'list' | 'create' | 'details' | 'approve';
type MovementSubTab = 'transactions' | 'counting' | 'adjustments';

export const MovementManagement: React.FC = () => {
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [movementSubTab, setMovementSubTab] = useState<MovementSubTab>('transactions');
  
  // Stock counting state
  const [counts, setCounts] = useState<StockCountResponse[]>([]);
  const [countLoading, setCountLoading] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState<StockCountResponse | null>(null);
  const [countViewMode, setCountViewMode] = useState<'list' | 'create' | 'details'>('list');
  const [countForm, setCountForm] = useState<CreateStockCountRequest>({
    countType: 'CYCLE_COUNT',
    locationId: '',
    itemId: '',
  });
  const [submitForm, setSubmitForm] = useState({
    physicalQuantity: 0,
    varianceReason: '',
  });
  const [showApproveCountDialog, setShowApproveCountDialog] = useState(false);
  const [countToApprove, setCountToApprove] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedCountId && countViewMode === 'details') {
      loadCountDetails();
    }
  }, [selectedCountId, countViewMode]);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<StockMovementResponse | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    movementType: '' as MovementType | '',
    status: '' as MovementStatus | '',
    itemId: '',
    dateFrom: '',
    dateTo: '',
    locationId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveAction, setApproveAction] = useState<{ id: string; approved: boolean } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [expandedMovementRows, setExpandedMovementRows] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<CreateStockMovementRequest>({
    movementType: MovementType.RECEIPT,
    itemId: '',
    quantity: 0,
    unitOfMeasure: 'pcs',
    reasonCode: '',
    requiresApproval: false,
  });
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [newSerialInput, setNewSerialInput] = useState('');
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [serialAttributes, setSerialAttributes] = useState<Record<string, Record<string, any>>>({});
  const [attributeTemplate, setAttributeTemplate] = useState<any | null>(null);

  useEffect(() => {
    loadMovements();
    loadItems();
    loadLocations();
    loadReasonCodes();
  }, []);

  useEffect(() => {
    if (viewMode === 'list' && movementSubTab === 'transactions') {
      loadMovements();
    } else if (movementSubTab === 'counting') {
      loadCounts();
    }
  }, [movementSubTab, filters, viewMode]);

  useEffect(() => {
    const handleQuickReceipt = () => {
      setMovementSubTab('transactions');
      setViewMode('create');
      setFormData({
        movementType: MovementType.RECEIPT,
        itemId: '',
        quantity: 0,
        unitOfMeasure: 'pcs',
        reasonCode: '',
        requiresApproval: false,
      });
    };

    const handleQuickTransfer = () => {
      setMovementSubTab('transactions');
      setViewMode('create');
      setFormData({
        movementType: MovementType.TRANSFER,
        itemId: '',
        quantity: 0,
        unitOfMeasure: 'pcs',
        reasonCode: '',
        requiresApproval: false,
      });
    };

    window.addEventListener('quick-receipt', handleQuickReceipt);
    window.addEventListener('quick-transfer', handleQuickTransfer);

    return () => {
      window.removeEventListener('quick-receipt', handleQuickReceipt);
      window.removeEventListener('quick-transfer', handleQuickTransfer);
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'list') {
      loadMovements();
    }
  }, [viewMode, filters]);

  useEffect(() => {
    if (selectedMovementId && viewMode === 'details') {
      loadMovementDetails();
    }
  }, [selectedMovementId, viewMode]);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getAllMovements({
        movementType: filters.movementType || undefined,
        status: filters.status || undefined,
        itemId: filters.itemId || undefined,
      });
      setMovements(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load movements');
      setError(message);
      logger.error('[MovementManagement] Failed to load movements', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMovementDetails = async () => {
    if (!selectedMovementId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getMovementById(selectedMovementId);
      setSelectedMovement(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load movement details');
      setError(message);
      logger.error('[MovementManagement] Failed to load movement details', err);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const data = await inventoryService.getAllItems({ isActive: true });
      setItems(data);
    } catch (err) {
      logger.error('[MovementManagement] Failed to load items', err);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await inventoryService.getAllLocations({ isActive: true });
      setLocations(data);
    } catch (err) {
      logger.error('[MovementManagement] Failed to load locations', err);
    }
  };

  const loadReasonCodes = async () => {
    try {
      // TODO: Load from reason codes API when available
      setReasonCodes(['RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE', 'WASTE', 'LOSS']);
    } catch (err) {
      logger.error('[MovementManagement] Failed to load reason codes', err);
    }
  };

  const loadVariants = async (itemId: string) => {
    try {
      const data = await inventoryService.getVariantsByItem(itemId);
      setVariants(data);
      // Auto-select default variant if exists
      const defaultVariant = data.find((v) => v.isDefault);
      if (defaultVariant) {
        setSelectedVariantId(defaultVariant.id);
        setFormData({ ...formData, variantId: defaultVariant.id });
      } else if (data.length > 0) {
        // Select first variant if no default
        setSelectedVariantId(data[0].id);
        setFormData({ ...formData, variantId: data[0].id });
      }
    } catch (err) {
      console.error('[MovementManagement] Failed to load variants', err);
    }
  };

  const loadAttributeTemplate = async (itemId: string, variantId?: string) => {
    try {
      const template = await inventoryService.getSerialAttributeTemplate(itemId, variantId);
      setAttributeTemplate(template);
    } catch (err) {
      console.error('[MovementManagement] Failed to load attribute template', err);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    try {
      // Prepare movement data with serialNumbers array
      const movementData: CreateStockMovementRequest = {
        ...formData,
      };
      
      // Add serialNumbers and serialAttributes if serial-tracked item
      const item = getSelectedItem();
      if (item?.industryFlags.requiresSerialTracking) {
        if (serialNumbers.length === 0) {
          setError('Serial numbers are required for serial-tracked items');
          return;
        }
        if (serialNumbers.length !== formData.quantity) {
          setError(`Quantity (${formData.quantity}) must match the number of serial numbers (${serialNumbers.length})`);
          return;
        }
        movementData.serialNumbers = serialNumbers;
        // Ensure quantity matches serial count
        movementData.quantity = serialNumbers.length;
        // Add serial attributes if provided
        if (Object.keys(serialAttributes).length > 0) {
          movementData.serialAttributes = serialAttributes;
        }
      }
      
      // Validate variant selection for items with variants
      if (item?.hasVariants && !selectedVariantId) {
        setError('Variant selection is required for items with variants');
        return;
      }
      
      // Add variantId if selected
      if (selectedVariantId) {
        movementData.variantId = selectedVariantId;
      }
      
      await inventoryService.createMovement(movementData);
      setSuccess('Movement created successfully');
      setViewMode('list');
      resetForm();
      loadMovements();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create movement');
      setError(message);
      logger.error('[MovementManagement] Failed to create movement', err);
    }
  };

  const handleApprove = async (reason?: string) => {
    if (!approveAction) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.approveMovement(
        approveAction.id,
        approveAction.approved,
        approveAction.approved ? undefined : reason
      );
      setSuccess(
        approveAction.approved ? 'Movement approved successfully' : 'Movement rejected'
      );
      setShowApproveDialog(false);
      setApproveAction(null);
      setRejectionReason('');
      loadMovements();
      if (selectedMovementId === approveAction.id) {
        loadMovementDetails();
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to process approval');
      setError(message);
      logger.error('[MovementManagement] Failed to approve movement', err);
    }
  };

  const resetForm = () => {
    setFormData({
      movementType: MovementType.RECEIPT,
      itemId: '',
      quantity: 0,
      unitOfMeasure: 'pcs',
      reasonCode: '',
      requiresApproval: false,
    });
    setSerialNumbers([]);
    setNewSerialInput('');
    setVariants([]);
    setSelectedVariantId('');
    setSerialAttributes({});
    setAttributeTemplate(null);
  };

  const getSelectedItem = () => {
    return items.find((item) => item.id === formData.itemId);
  };
  
  const loadCounts = async () => {
    setCountLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getCountHistory();
      setCounts(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load stock counts');
      setError(message);
      logger.error('[MovementManagement] Failed to load counts', err);
    } finally {
      setCountLoading(false);
    }
  };
  
  const loadCountDetails = async () => {
    if (!selectedCountId) return;
    setCountLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getCountHistory();
      const count = data.find((c) => c.id === selectedCountId);
      if (count) {
        setSelectedCount(count);
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load count details');
      setError(message);
      logger.error('[MovementManagement] Failed to load count details', err);
    } finally {
      setCountLoading(false);
    }
  };
  
  const handleCreateCount = async () => {
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.createStockCount(countForm);
      setSuccess('Stock count created successfully');
      setCountViewMode('list');
      setCountForm({
        countType: 'CYCLE_COUNT',
        locationId: '',
        itemId: '',
      });
      loadCounts();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create stock count');
      setError(message);
      logger.error('[MovementManagement] Failed to create count', err);
    }
  };
  
  const handleSubmitCount = async () => {
    if (!selectedCountId) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.submitCount(
        selectedCountId,
        submitForm.physicalQuantity,
        submitForm.varianceReason || undefined
      );
      setSuccess('Count submitted successfully');
      setSubmitForm({ physicalQuantity: 0, varianceReason: '' });
      loadCountDetails();
      loadCounts();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to submit count');
      setError(message);
      logger.error('[MovementManagement] Failed to submit count', err);
    }
  };
  
  const handleApproveCount = async () => {
    if (!countToApprove) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.approveCount(countToApprove);
      setSuccess('Count approved successfully');
      setShowApproveCountDialog(false);
      setCountToApprove(null);
      loadCounts();
      if (selectedCountId === countToApprove) {
        loadCountDetails();
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to approve count');
      setError(message);
      logger.error('[MovementManagement] Failed to approve count', err);
    }
  };

  const renderList = () => (
    <div className="movement-management-list">
      <div className="movement-management-toolbar">
        <div className="movement-management-filters">
          <Select
            value={filters.movementType}
            onChange={(e) =>
              setFilters({ ...filters, movementType: e.target.value as MovementType | '' })
            }
            style={{ width: '200px' }}
          >
            <option value="">All Types</option>
            {Object.values(MovementType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as MovementStatus | '' })
            }
            style={{ width: '200px' }}
          >
            <option value="">All Statuses</option>
            {Object.values(MovementStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle advanced filters"
          >
            {showFilters ? 'Hide Filters' : 'More Filters'}
          </Button>
        </div>
        <Button variant="primary" onClick={() => setViewMode('create')}>
          Create Movement
        </Button>
      </div>
      
      {showFilters && (
        <div className="filter-bar-expanded">
          <div className="filter-row">
            <div className="filter-group">
              <label>Item</label>
              <Select
                value={filters.itemId}
                onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
                style={{ width: '250px' }}
              >
                <option value="">All Items</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} - {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="filter-group">
              <label>Location</label>
              <Select
                value={filters.locationId}
                onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
                style={{ width: '200px' }}
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="filter-group">
              <label>Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={{ width: '150px' }}
              />
            </div>
            <div className="filter-group">
              <label>Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={{ width: '150px' }}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({
                  movementType: '' as MovementType | '',
                  status: '' as MovementStatus | '',
                  itemId: '',
                  dateFrom: '',
                  dateTo: '',
                  locationId: '',
                });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <LoadingState message="Loading movements..." />
      ) : movements.length === 0 ? (
        <EmptyState message="No movements found" />
      ) : (
        <div className="movement-management-table">
          <table>
            <thead>
              <tr>
                <th>Movement #</th>
                <th>Type</th>
                <th>Item</th>
                <th>From</th>
                <th>To</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const isExpanded = expandedMovementRows.has(movement.id);
                const hasSerials = movement.serialNumbers && movement.serialNumbers.length > 0;
                const hasAttributes = movement.serialAttributes && Object.keys(movement.serialAttributes).length > 0;
                return (
                  <React.Fragment key={movement.id}>
                    <tr
                      className="expandable-row"
                      onClick={() => {
                        setSelectedMovementId(movement.id);
                        setViewMode('details');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="expandable-row-header">
                          {(hasSerials || hasAttributes || movement.batchNumber) && (
                            <span
                              className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExpanded = new Set(expandedMovementRows);
                                if (newExpanded.has(movement.id)) {
                                  newExpanded.delete(movement.id);
                                } else {
                                  newExpanded.add(movement.id);
                                }
                                setExpandedMovementRows(newExpanded);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              ▶
                            </span>
                          )}
                          {movement.movementNumber}
                        </div>
                      </td>
                      <td>{movement.movementType}</td>
                      <td>{movement.item?.name || movement.itemId}</td>
                      <td>{movement.fromLocation?.code || '-'}</td>
                      <td>{movement.toLocation?.code || '-'}</td>
                      <td>{movement.quantity} {movement.unitOfMeasure}</td>
                      <td>
                        <span className={`status-${movement.status.toLowerCase()}`}>
                          {movement.status}
                        </span>
                      </td>
                      <td>{new Date(movement.createdAt).toLocaleDateString()}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMovementId(movement.id);
                              setViewMode('details');
                            }}
                            title="View Details"
                          >
                            View
                          </Button>
                          {movement.status === MovementStatus.PENDING && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setApproveAction({ id: movement.id, approved: true });
                                  setShowApproveDialog(true);
                                }}
                                title="Approve Movement"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setApproveAction({ id: movement.id, approved: false });
                                  setShowApproveDialog(true);
                                }}
                                title="Reject Movement"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (hasSerials || hasAttributes || movement.batchNumber) && (
                      <tr>
                        <td colSpan={9} className="expanded-content">
                          <div className="expanded-content-grid">
                            {movement.batchNumber && (
                              <div className="expanded-content-item">
                                <span className="expanded-content-label">Batch Number</span>
                                <span className="expanded-content-value">{movement.batchNumber}</span>
                              </div>
                            )}
                            {hasSerials && (
                              <div className="expanded-content-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="expanded-content-label">Serial Numbers</span>
                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {movement.serialNumbers?.map((serial, idx) => (
                                    <span key={idx} style={{ padding: '4px 8px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '12px' }}>
                                      {serial}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {hasAttributes && (
                              <div className="expanded-content-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="expanded-content-label">Serial Attributes</span>
                                <div style={{ marginTop: '8px' }}>
                                  {Object.entries(movement.serialAttributes || {}).map(([serial, attrs]) => (
                                    <div key={serial} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                      <strong style={{ fontSize: '12px' }}>{serial}:</strong>
                                      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {Object.entries(attrs as Record<string, any>).map(([key, value]) => (
                                          <span key={key} style={{ fontSize: '12px' }}>
                                            {key}: <strong>{String(value)}</strong>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {movement.reasonCode && (
                              <div className="expanded-content-item">
                                <span className="expanded-content-label">Reason Code</span>
                                <span className="expanded-content-value">{movement.reasonCode}</span>
                              </div>
                            )}
                            {movement.reasonDescription && (
                              <div className="expanded-content-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="expanded-content-label">Reason Description</span>
                                <span className="expanded-content-value">{movement.reasonDescription}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderForm = () => {
    const selectedItem = getSelectedItem();

    return (
      <Card className="movement-management-form">
        <h2>Create Stock Movement</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label>Movement Type *</label>
          <Select
            value={formData.movementType}
            onChange={(e) => {
              const newType = e.target.value as MovementType;
              setFormData({
                ...formData,
                movementType: newType,
                fromLocationId: newType === MovementType.RECEIPT ? undefined : formData.fromLocationId,
                toLocationId: newType === MovementType.ISSUE ? undefined : formData.toLocationId,
              });
            }}
          >
            {Object.values(MovementType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>

        <div className="form-group">
          <label>Item *</label>
          <Select
            value={formData.itemId}
            onChange={async (e) => {
              const item = items.find((i) => i.id === e.target.value);
              const previousItem = getSelectedItem();
              setFormData({
                ...formData,
                itemId: e.target.value,
                unitOfMeasure: item?.unitOfMeasure || 'pcs',
              });
              // Reset serials if item changes or new item doesn't require serial tracking
              if (!item?.industryFlags.requiresSerialTracking || 
                  (previousItem && previousItem.id !== item?.id)) {
                setSerialNumbers([]);
                setNewSerialInput('');
                setSerialAttributes({});
              }
              
              // Load variants if item has variants
              if (item?.hasVariants && e.target.value) {
                await loadVariants(e.target.value);
              } else {
                setVariants([]);
                setSelectedVariantId('');
              }
              
              // Load attribute template if serial-tracked item
              if (item?.industryFlags.requiresSerialTracking && e.target.value) {
                await loadAttributeTemplate(e.target.value, selectedVariantId || undefined);
              } else {
                setAttributeTemplate(null);
              }
            }}
          >
            <option value="">Select Item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sku} - {item.name}
              </option>
            ))}
          </Select>
        </div>

        {formData.movementType === MovementType.TRANSFER && (
          <>
            <div className="form-group">
              <label>From Location *</label>
              <Select
                value={formData.fromLocationId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, fromLocationId: e.target.value || undefined })
                }
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="form-group">
              <label>To Location *</label>
              <Select
                value={formData.toLocationId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, toLocationId: e.target.value || undefined })
                }
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {formData.movementType === MovementType.RECEIPT && (
          <div className="form-group">
            <label>To Location *</label>
            <Select
              value={formData.toLocationId || ''}
              onChange={(e) =>
                setFormData({ ...formData, toLocationId: e.target.value || undefined })
              }
            >
              <option value="">Select Location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {(formData.movementType === MovementType.ISSUE ||
          formData.movementType === MovementType.DAMAGE ||
          formData.movementType === MovementType.WASTE ||
          formData.movementType === MovementType.LOSS ||
          formData.movementType === MovementType.BLOCK) && (
          <div className="form-group">
            <label>From Location *</label>
            <Select
              value={formData.fromLocationId || ''}
              onChange={(e) =>
                setFormData({ ...formData, fromLocationId: e.target.value || undefined })
              }
            >
              <option value="">Select Location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {selectedItem?.hasVariants && (
          <div className="form-group">
            <label>Variant *</label>
            <Select
              value={selectedVariantId}
              onChange={(e) => {
                const variantId = e.target.value;
                setSelectedVariantId(variantId);
                setFormData({ ...formData, variantId: variantId || undefined });
                // Reload attribute template with new variant
                if (selectedItem?.industryFlags.requiresSerialTracking) {
                  loadAttributeTemplate(formData.itemId, variantId || undefined);
                }
              }}
            >
              <option value="">Select Variant</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.code} - {variant.name} {variant.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </Select>
          </div>
        )}

        {selectedItem?.industryFlags.requiresBatchTracking && (
          <div className="form-group">
            <label>Batch Number</label>
            <Input
              value={formData.batchNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, batchNumber: e.target.value || undefined })
              }
              placeholder="BATCH-001"
            />
          </div>
        )}

        {selectedItem?.industryFlags.requiresSerialTracking && (
          <div className="form-group">
            <label>
              Serial Numbers ({serialNumbers.length} entered)
            </label>
            <div className="serial-input-row">
              <Input
                value={newSerialInput}
                onChange={(e) => setNewSerialInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newSerialInput.trim().toUpperCase();
                    if (trimmed && !serialNumbers.includes(trimmed)) {
                      const updated = [...serialNumbers, trimmed];
                      setSerialNumbers(updated);
                      setNewSerialInput('');
                      setFormData({ ...formData, quantity: updated.length });
                    }
                  }
                }}
                placeholder="Enter serial number and press Enter or click Add"
                className="serial-numbers-input"
              />
              <Button
                type="button"
                onClick={() => {
                  const trimmed = newSerialInput.trim().toUpperCase();
                  if (trimmed && !serialNumbers.includes(trimmed)) {
                    const updated = [...serialNumbers, trimmed];
                    setSerialNumbers(updated);
                    setNewSerialInput('');
                    setFormData({ ...formData, quantity: updated.length });
                  }
                }}
                disabled={!newSerialInput.trim() || serialNumbers.includes(newSerialInput.trim().toUpperCase())}
              >
                Add
              </Button>
            </div>
            {serialNumbers.length > 0 && (
              <div className="serial-numbers-list">
                {serialNumbers.map((serial, index) => (
                  <div key={index} className="serial-chip">
                    <span>{serial}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = serialNumbers.filter((_, i) => i !== index);
                        setSerialNumbers(updated);
                        setFormData({ ...formData, quantity: updated.length });
                      }}
                      aria-label={`Remove serial ${serial}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="serial-paste-area"
              placeholder="Paste multiple serials here (one per line) and press Enter to add all"
              rows={3}
              onPaste={(e) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                const lines = pastedText
                  .split('\n')
                  .map((line) => line.trim().toUpperCase())
                  .filter((line) => line.length > 0);
                
                const newSerials = [...serialNumbers];
                let added = 0;
                for (const line of lines) {
                  if (!newSerials.includes(line)) {
                    newSerials.push(line);
                    added++;
                  }
                }
                
                if (added > 0) {
                  setSerialNumbers(newSerials);
                  setFormData({ ...formData, quantity: newSerials.length });
                }
              }}
            />
            <div className="form-hint" style={{ marginTop: '8px' }}>
              Enter serials individually above, or paste multiple serials (one per line) in the box above.
            </div>
            {attributeTemplate && attributeTemplate.fields.length > 0 && serialNumbers.length > 0 && (
              <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <label style={{ fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                  Serial Attributes
                </label>
                {serialNumbers.map((serial, index) => (
                  <div key={index} style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#fff', borderRadius: '4px' }}>
                    <div style={{ fontWeight: '500', marginBottom: '8px', color: '#333' }}>Serial: {serial}</div>
                    {attributeTemplate.fields.map((field: any) => (
                      <div key={field.key} style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#666' }}>
                          {field.label} {field.required && <span style={{ color: '#d32f2f' }}>*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <Select
                            value={serialAttributes[serial]?.[field.key] || ''}
                            onChange={(e) => {
                              const updated = {
                                ...serialAttributes,
                                [serial]: {
                                  ...serialAttributes[serial],
                                  [field.key]: e.target.value || undefined,
                                },
                              };
                              setSerialAttributes(updated);
                            }}
                          >
                            <option value="">Select {field.label}</option>
                            {field.options?.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </Select>
                        ) : field.type === 'date' ? (
                          <Input
                            type="date"
                            value={serialAttributes[serial]?.[field.key] || ''}
                            onChange={(e) => {
                              const updated = {
                                ...serialAttributes,
                                [serial]: {
                                  ...serialAttributes[serial],
                                  [field.key]: e.target.value || undefined,
                                },
                              };
                              setSerialAttributes(updated);
                            }}
                          />
                        ) : field.type === 'number' ? (
                          <Input
                            type="number"
                            value={serialAttributes[serial]?.[field.key] || ''}
                            onChange={(e) => {
                              const updated = {
                                ...serialAttributes,
                                [serial]: {
                                  ...serialAttributes[serial],
                                  [field.key]: e.target.value ? parseFloat(e.target.value) : undefined,
                                },
                              };
                              setSerialAttributes(updated);
                            }}
                          />
                        ) : (
                          <Input
                            value={serialAttributes[serial]?.[field.key] || ''}
                            onChange={(e) => {
                              const updated = {
                                ...serialAttributes,
                                [serial]: {
                                  ...serialAttributes[serial],
                                  [field.key]: e.target.value || undefined,
                                },
                              };
                              setSerialAttributes(updated);
                            }}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedItem?.industryFlags.hasExpiryDate && (
          <div className="form-group">
            <label>Expiry Date</label>
            <Input
              type="date"
              value={formData.expiryDate || ''}
              onChange={(e) =>
                setFormData({ ...formData, expiryDate: e.target.value || undefined })
              }
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>
              Quantity *
              {selectedItem?.industryFlags.requiresSerialTracking && (
                <span className="form-hint"> (auto-synced with serial count)</span>
              )}
            </label>
            <Input
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => {
                const qty = parseFloat(e.target.value) || 0;
                setFormData({ ...formData, quantity: qty });
              }}
              disabled={selectedItem?.industryFlags.requiresSerialTracking === true}
              readOnly={selectedItem?.industryFlags.requiresSerialTracking === true}
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Unit of Measure *</label>
            <Input
              value={formData.unitOfMeasure}
              onChange={(e) =>
                setFormData({ ...formData, unitOfMeasure: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label>Reason Code *</label>
          <Select
            value={formData.reasonCode}
            onChange={(e) => setFormData({ ...formData, reasonCode: e.target.value })}
          >
            <option value="">Select Reason</option>
            {reasonCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </div>

        <div className="form-group">
          <label>Reason Description</label>
          <textarea
            value={formData.reasonDescription || ''}
            onChange={(e) =>
              setFormData({ ...formData, reasonDescription: e.target.value || undefined })
            }
            rows={3}
            placeholder="Additional details about this movement"
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.requiresApproval}
              onChange={(e) =>
                setFormData({ ...formData, requiresApproval: e.target.checked })
              }
            />
            Requires Approval
          </label>
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => setViewMode('list')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            Create Movement
          </Button>
        </div>
      </Card>
    );
  };

  const renderDetails = () => {
    if (!selectedMovement) {
      return <LoadingState message="Loading movement details..." />;
    }

    return (
      <Card className="movement-management-details">
        <div className="details-header">
          <h2>Movement {selectedMovement.movementNumber}</h2>
          <div className="details-actions">
            <Button variant="secondary" onClick={() => setViewMode('list')}>
              Back to List
            </Button>
            {selectedMovement.status === MovementStatus.PENDING && (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    setApproveAction({ id: selectedMovement.id, approved: true });
                    setShowApproveDialog(true);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setApproveAction({ id: selectedMovement.id, approved: false });
                    setShowApproveDialog(true);
                  }}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h3>Movement Information</h3>
            <div className="details-grid">
              <div>
                <label>Movement Number</label>
                <div>{selectedMovement.movementNumber}</div>
              </div>
              <div>
                <label>Type</label>
                <div>{selectedMovement.movementType}</div>
              </div>
              <div>
                <label>Status</label>
                <div>
                  <span className={`status-${selectedMovement.status.toLowerCase()}`}>
                    {selectedMovement.status}
                  </span>
                </div>
              </div>
              <div>
                <label>Quantity</label>
                <div>
                  {selectedMovement.quantity} {selectedMovement.unitOfMeasure}
                </div>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Item Information</h3>
            <div className="details-grid">
              <div>
                <label>Item</label>
                <div>{selectedMovement.item?.name || selectedMovement.itemId}</div>
              </div>
              <div>
                <label>SKU</label>
                <div>{selectedMovement.item?.sku || '-'}</div>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Location Information</h3>
            <div className="details-grid">
              {selectedMovement.fromLocation && (
                <div>
                  <label>From Location</label>
                  <div>
                    {selectedMovement.fromLocation.code} - {selectedMovement.fromLocation.name}
                  </div>
                </div>
              )}
              {selectedMovement.toLocation && (
                <div>
                  <label>To Location</label>
                  <div>
                    {selectedMovement.toLocation.code} - {selectedMovement.toLocation.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(selectedMovement.batchNumber || selectedMovement.serialNumber || (selectedMovement.serialNumbers && selectedMovement.serialNumbers.length > 0)) && (
            <div className="details-section">
              <h3>Batch/Serial Information</h3>
              <div className="details-grid">
                {selectedMovement.batchNumber && (
                  <div>
                    <label>Batch Number</label>
                    <div>{selectedMovement.batchNumber}</div>
                  </div>
                )}
                {selectedMovement.serialNumbers && selectedMovement.serialNumbers.length > 0 ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Serial Numbers ({selectedMovement.serialNumbers.length})</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {selectedMovement.serialNumbers.map((serial, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '16px',
                            fontSize: '13px',
                          }}
                        >
                          {serial}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : selectedMovement.serialNumber ? (
                  <div>
                    <label>Serial Number</label>
                    <div>{selectedMovement.serialNumber}</div>
                  </div>
                ) : null}
                {selectedMovement.serialAttributes && Object.keys(selectedMovement.serialAttributes).length > 0 && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                    <label>Serial Attributes</label>
                    <div style={{ marginTop: '12px' }}>
                      {Object.entries(selectedMovement.serialAttributes).map(([serialNumber, attributes]) => (
                        <div key={serialNumber} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>Serial: {serialNumber}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            {Object.entries(attributes).map(([key, value]) => (
                              <div key={key}>
                                <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>{key}:</span>
                                <span style={{ marginLeft: '8px', color: '#333' }}>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedMovement.expiryDate && (
                  <div>
                    <label>Expiry Date</label>
                    <div>{new Date(selectedMovement.expiryDate).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="details-section">
            <h3>Reason & Reference</h3>
            <div className="details-grid">
              <div>
                <label>Reason Code</label>
                <div>{selectedMovement.reasonCode}</div>
              </div>
              {selectedMovement.reasonDescription && (
                <div>
                  <label>Reason Description</label>
                  <div>{selectedMovement.reasonDescription}</div>
                </div>
              )}
              {selectedMovement.referenceNumber && (
                <div>
                  <label>Reference Number</label>
                  <div>{selectedMovement.referenceNumber}</div>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <h3>Approval Information</h3>
            <div className="details-grid">
              <div>
                <label>Requires Approval</label>
                <div>{selectedMovement.requiresApproval ? 'Yes' : 'No'}</div>
              </div>
              {selectedMovement.approvedBy && (
                <div>
                  <label>Approved By</label>
                  <div>{selectedMovement.approvedBy}</div>
                </div>
              )}
              {selectedMovement.approvedAt && (
                <div>
                  <label>Approved At</label>
                  <div>{new Date(selectedMovement.approvedAt).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <h3>Audit Information</h3>
            <div className="details-grid">
              <div>
                <label>Created By</label>
                <div>{selectedMovement.createdBy.name}</div>
              </div>
              <div>
                <label>Created At</label>
                <div>{new Date(selectedMovement.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderCountingView = () => {
    if (countViewMode === 'create') {
      return (
        <Card className="counting-form">
          <h2>Create Stock Count</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label>Count Type *</label>
            <Select
              value={countForm.countType}
              onChange={(e) =>
                setCountForm({
                  ...countForm,
                  countType: e.target.value as 'CYCLE_COUNT' | 'FULL_COUNT' | 'SPOT_CHECK',
                })
              }
            >
              <option value="CYCLE_COUNT">Cycle Count</option>
              <option value="FULL_COUNT">Full Count</option>
              <option value="SPOT_CHECK">Spot Check</option>
            </Select>
          </div>

          {countForm.countType !== 'FULL_COUNT' && (
            <>
              <div className="form-group">
                <label>Location</label>
                <Select
                  value={countForm.locationId}
                  onChange={(e) => setCountForm({ ...countForm, locationId: e.target.value })}
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-group">
                <label>Item</label>
                <Select
                  value={countForm.itemId}
                  onChange={(e) => setCountForm({ ...countForm, itemId: e.target.value })}
                >
                  <option value="">Select Item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div className="form-actions">
            <Button variant="secondary" onClick={() => setCountViewMode('list')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCount}>
              Create Count
            </Button>
          </div>
        </Card>
      );
    }

    if (countViewMode === 'details' && selectedCount) {
      return (
        <Card className="counting-details">
          <div className="details-header">
            <h2>Stock Count Details</h2>
            <div className="details-actions">
              <Button variant="secondary" onClick={() => setCountViewMode('list')}>
                Back to List
              </Button>
            </div>
          </div>

          <div className="details-content">
            <div className="details-section">
              <h3>Count Information</h3>
              <div className="details-grid">
                <div>
                  <label>Count Number</label>
                  <div>{selectedCount.countNumber}</div>
                </div>
                <div>
                  <label>Type</label>
                  <div>{selectedCount.countType}</div>
                </div>
                <div>
                  <label>Location</label>
                  <div>{selectedCount.location ? `${selectedCount.location.code} - ${selectedCount.location.name}` : '-'}</div>
                </div>
                <div>
                  <label>Item</label>
                  <div>{selectedCount.item ? `${selectedCount.item.sku} - ${selectedCount.item.name}` : '-'}</div>
                </div>
                <div>
                  <label>System Quantity</label>
                  <div>{selectedCount.systemQuantity}</div>
                </div>
                <div>
                  <label>Physical Quantity</label>
                  <div>{selectedCount.physicalQuantity}</div>
                </div>
                <div>
                  <label>Variance</label>
                  <div>
                    <span className={selectedCount.variance === 0 ? 'variance-zero' : selectedCount.variance > 0 ? 'variance-positive' : 'variance-negative'}>
                      {selectedCount.variance > 0 ? '+' : ''}{selectedCount.variance}
                    </span>
                  </div>
                </div>
                <div>
                  <label>Status</label>
                  <div>
                    <span className={`status-${selectedCount.status.toLowerCase()}`}>
                      {selectedCount.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedCount.status === 'PENDING' && (
              <div className="details-section">
                <h3>Submit Count</h3>
                <div className="form-group">
                  <label>Physical Quantity *</label>
                  <Input
                    type="number"
                    value={submitForm.physicalQuantity}
                    onChange={(e) => setSubmitForm({ ...submitForm, physicalQuantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Variance Reason</label>
                  <Input
                    value={submitForm.varianceReason}
                    onChange={(e) => setSubmitForm({ ...submitForm, varianceReason: e.target.value })}
                    placeholder="Reason for variance (if any)"
                  />
                </div>
                <div className="form-actions">
                  <Button variant="primary" onClick={handleSubmitCount}>
                    Submit Count
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      );
    }

    return (
      <div className="counting-list">
        <div className="counting-toolbar">
          <Button variant="primary" onClick={() => setCountViewMode('create')}>
            Create Stock Count
          </Button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {countLoading ? (
          <LoadingState message="Loading stock counts..." />
        ) : counts.length === 0 ? (
          <EmptyState message="No stock counts found" />
        ) : (
          <div className="counting-table">
            <table>
              <thead>
                <tr>
                  <th>Count #</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Item</th>
                  <th>System Qty</th>
                  <th>Physical Qty</th>
                  <th>Variance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {counts.map((count) => (
                  <tr
                    key={count.id}
                    onClick={() => {
                      setSelectedCountId(count.id);
                      setCountViewMode('details');
                      loadCountDetails();
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{count.countNumber}</td>
                    <td>{count.countType}</td>
                    <td>{count.location?.code || '-'}</td>
                    <td>{count.item?.name || '-'}</td>
                    <td>{count.systemQuantity}</td>
                    <td>{count.physicalQuantity}</td>
                    <td>
                      <span className={count.variance === 0 ? 'variance-zero' : count.variance > 0 ? 'variance-positive' : 'variance-negative'}>
                        {count.variance > 0 ? '+' : ''}{count.variance}
                      </span>
                    </td>
                    <td>
                      <span className={`status-${count.status.toLowerCase()}`}>
                        {count.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCountId(count.id);
                          setCountViewMode('details');
                          loadCountDetails();
                        }}
                      >
                        View
                      </Button>
                      {count.status === 'COMPLETED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCountToApprove(count.id);
                            setShowApproveCountDialog(true);
                          }}
                        >
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="movement-management">
      {/* Sub-tabs */}
      {viewMode === 'list' && (
        <div className="movement-sub-tabs">
          <button
            className={`movement-sub-tab ${movementSubTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setMovementSubTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`movement-sub-tab ${movementSubTab === 'counting' ? 'active' : ''}`}
            onClick={() => setMovementSubTab('counting')}
          >
            Counting
          </button>
          <button
            className={`movement-sub-tab ${movementSubTab === 'adjustments' ? 'active' : ''}`}
            onClick={() => setMovementSubTab('adjustments')}
          >
            Adjustments
          </button>
        </div>
      )}

      {/* Content based on sub-tab */}
      {viewMode === 'list' && movementSubTab === 'transactions' && renderList()}
      {viewMode === 'list' && movementSubTab === 'counting' && renderCountingView()}
      {viewMode === 'list' && movementSubTab === 'adjustments' && (
        <div className="adjustments-placeholder">
          <h3>Manual Adjustments</h3>
          <p>Manual adjustment functionality coming soon...</p>
          <p>For now, use stock movements with type ADJUSTMENT.</p>
        </div>
      )}
      {viewMode === 'create' && renderForm()}
      {viewMode === 'details' && renderDetails()}

      <ConfirmDialog
        isOpen={showApproveCountDialog}
        title="Approve Stock Count"
        message="Are you sure you want to approve this stock count? This will create an adjustment movement."
        onConfirm={() => handleApproveCount()}
        onCancel={() => {
          setShowApproveCountDialog(false);
          setCountToApprove(null);
        }}
        variant="primary"
      />

      <ConfirmDialog
        isOpen={showApproveDialog}
        title={approveAction?.approved ? 'Approve Movement' : 'Reject Movement'}
        message={
          approveAction?.approved
            ? 'Are you sure you want to approve this movement?'
            : 'Please provide a reason for rejecting this movement.'
        }
        requiresReason={!approveAction?.approved}
        onConfirm={handleApprove}
        onCancel={() => {
          setShowApproveDialog(false);
          setApproveAction(null);
          setRejectionReason('');
        }}
        variant={approveAction?.approved ? 'info' : 'danger'}
      />
    </div>
  );
};
