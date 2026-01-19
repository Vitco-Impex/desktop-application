/**
 * Stock Counting Component - Cycle counting and physical stock counts
 */

import React, { useState, useEffect } from 'react';
import {
  inventoryService,
  StockCountResponse,
  CreateStockCountRequest,
  InventoryItem,
  Location,
} from '@/services/inventory.service';
import { Button, Input, Card, Select } from '@/shared/components/ui';
import { LoadingState, EmptyState, ErrorState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog } from '@/shared/components/modals';
import './StockCounting.css';

type ViewMode = 'list' | 'create' | 'details';

export const StockCounting: React.FC = () => {
  const [counts, setCounts] = useState<StockCountResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState<StockCountResponse | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [countToApprove, setCountToApprove] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateStockCountRequest>({
    countType: 'CYCLE_COUNT',
    locationId: '',
    itemId: '',
  });

  const [submitForm, setSubmitForm] = useState({
    physicalQuantity: 0,
    varianceReason: '',
  });

  // Load functions - defined before useEffects to avoid TDZ errors
  const loadCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getCountHistory();
      setCounts(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load stock counts');
      setError(message);
      logger.error('[StockCounting] Failed to load counts', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCountDetails = async () => {
    if (!selectedCountId) return;
    setLoading(true);
    setError(null);
    try {
      // Note: We'll need to get individual count by ID - for now use history
      const data = await inventoryService.getCountHistory();
      const count = data.find((c) => c.id === selectedCountId);
      if (count) {
        setSelectedCount(count);
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load count details');
      setError(message);
      logger.error('[StockCounting] Failed to load count details', err);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const data = await inventoryService.getAllItems({ isActive: true });
      setItems(data);
    } catch (err) {
      logger.error('[StockCounting] Failed to load items', err);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await inventoryService.getAllLocations({ isActive: true });
      setLocations(data);
    } catch (err) {
      logger.error('[StockCounting] Failed to load locations', err);
    }
  };

  useEffect(() => {
    loadCounts();
    loadItems();
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedCountId && viewMode === 'details') {
      loadCountDetails();
    }
  }, [selectedCountId, viewMode]);

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.createStockCount(formData);
      setSuccess('Stock count created successfully');
      setViewMode('list');
      setFormData({
        countType: 'CYCLE_COUNT',
        locationId: '',
        itemId: '',
      });
      loadCounts();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create stock count');
      setError(message);
      logger.error('[StockCounting] Failed to create count', err);
    }
  };

  const handleSubmit = async () => {
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
      logger.error('[StockCounting] Failed to submit count', err);
    }
  };

  const handleApprove = async () => {
    if (!countToApprove) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.approveCount(countToApprove);
      setSuccess('Count approved successfully');
      setShowApproveDialog(false);
      setCountToApprove(null);
      loadCounts();
      if (selectedCountId === countToApprove) {
        loadCountDetails();
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to approve count');
      setError(message);
      logger.error('[StockCounting] Failed to approve count', err);
    }
  };

  const renderList = () => (
    <div className="stock-counting-list">
      <div className="stock-counting-toolbar">
        <Button variant="primary" onClick={() => setViewMode('create')}>
          Create Stock Count
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <LoadingState message="Loading stock counts..." />
      ) : counts.length === 0 ? (
        <EmptyState message="No stock counts found" />
      ) : (
        <div className="stock-counting-table">
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
                <th>Counted By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((count) => (
                <tr
                  key={count.id}
                  onClick={() => {
                    setSelectedCountId(count.id);
                    setViewMode('details');
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
                    <span
                      className={
                        count.variance === 0
                          ? 'variance-zero'
                          : count.variance > 0
                          ? 'variance-positive'
                          : 'variance-negative'
                      }
                    >
                      {count.variance > 0 ? '+' : ''}
                      {count.variance}
                    </span>
                  </td>
                  <td>
                    <span className={`status-${count.status.toLowerCase()}`}>
                      {count.status}
                    </span>
                  </td>
                  <td>{count.countedBy.name}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCountId(count.id);
                        setViewMode('details');
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
                          setShowApproveDialog(true);
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

  const renderForm = () => (
    <Card className="stock-counting-form">
      <h2>Create Stock Count</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Count Type *</label>
        <Select
          value={formData.countType}
          onChange={(e) =>
            setFormData({
              ...formData,
              countType: e.target.value as 'CYCLE_COUNT' | 'FULL_COUNT' | 'SPOT_CHECK',
            })
          }
        >
          <option value="CYCLE_COUNT">Cycle Count</option>
          <option value="FULL_COUNT">Full Count</option>
          <option value="SPOT_CHECK">Spot Check</option>
        </Select>
      </div>

      {formData.countType !== 'FULL_COUNT' && (
        <>
          <div className="form-group">
            <label>Location</label>
            <Select
              value={formData.locationId || ''}
              onChange={(e) =>
                setFormData({ ...formData, locationId: e.target.value || undefined })
              }
            >
              <option value="">Select Location (optional)</option>
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
              value={formData.itemId || ''}
              onChange={(e) =>
                setFormData({ ...formData, itemId: e.target.value || undefined })
              }
            >
              <option value="">Select Item (optional)</option>
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
        <Button variant="secondary" onClick={() => setViewMode('list')}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCreate}>
          Create Count
        </Button>
      </div>
    </Card>
  );

  const renderDetails = () => {
    if (!selectedCount) {
      return <LoadingState message="Loading count details..." />;
    }

    return (
      <Card className="stock-counting-details">
        <div className="details-header">
          <h2>Stock Count {selectedCount.countNumber}</h2>
          <div className="details-actions">
            <Button variant="secondary" onClick={() => setViewMode('list')}>
              Back to List
            </Button>
            {selectedCount.status === 'COMPLETED' && (
              <Button
                variant="primary"
                onClick={() => {
                  setCountToApprove(selectedCount.id);
                  setShowApproveDialog(true);
                }}
              >
                Approve
              </Button>
            )}
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
                <label>Status</label>
                <div>
                  <span className={`status-${selectedCount.status.toLowerCase()}`}>
                    {selectedCount.status}
                  </span>
                </div>
              </div>
              {selectedCount.location && (
                <div>
                  <label>Location</label>
                  <div>
                    {selectedCount.location.code} - {selectedCount.location.name}
                  </div>
                </div>
              )}
              {selectedCount.item && (
                <div>
                  <label>Item</label>
                  <div>{selectedCount.item.name}</div>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <h3>Count Results</h3>
            <div className="details-grid">
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
                  <span
                    className={
                      selectedCount.variance === 0
                        ? 'variance-zero'
                        : selectedCount.variance > 0
                        ? 'variance-positive'
                        : 'variance-negative'
                    }
                  >
                    {selectedCount.variance > 0 ? '+' : ''}
                    {selectedCount.variance}
                  </span>
                </div>
              </div>
              {selectedCount.varianceReason && (
                <div>
                  <label>Variance Reason</label>
                  <div>{selectedCount.varianceReason}</div>
                </div>
              )}
            </div>
          </div>

          {selectedCount.status === 'IN_PROGRESS' && (
            <div className="details-section">
              <h3>Submit Count</h3>
              <div className="form-group">
                <label>Physical Quantity *</label>
                <Input
                  type="number"
                  value={submitForm.physicalQuantity || ''}
                  onChange={(e) =>
                    setSubmitForm({
                      ...submitForm,
                      physicalQuantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Variance Reason</label>
                <textarea
                  value={submitForm.varianceReason}
                  onChange={(e) =>
                    setSubmitForm({ ...submitForm, varianceReason: e.target.value })
                  }
                  rows={3}
                  placeholder="Reason for variance (if any)"
                />
              </div>
              <div className="form-actions">
                <Button variant="primary" onClick={handleSubmit}>
                  Submit Count
                </Button>
              </div>
            </div>
          )}

          <div className="details-section">
            <h3>Audit Information</h3>
            <div className="details-grid">
              <div>
                <label>Counted By</label>
                <div>{selectedCount.countedBy.name}</div>
              </div>
              <div>
                <label>Counted At</label>
                <div>{new Date(selectedCount.countedAt).toLocaleString()}</div>
              </div>
              {selectedCount.approvedBy && (
                <>
                  <div>
                    <label>Approved By</label>
                    <div>{selectedCount.approvedBy.name}</div>
                  </div>
                  <div>
                    <label>Approved At</label>
                    <div>
                      {selectedCount.approvedAt
                        ? new Date(selectedCount.approvedAt).toLocaleString()
                        : '-'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="stock-counting">
      {viewMode === 'list' && renderList()}
      {viewMode === 'create' && renderForm()}
      {viewMode === 'details' && renderDetails()}

      <ConfirmDialog
        isOpen={showApproveDialog}
        title="Approve Stock Count"
        message="Are you sure you want to approve this stock count? An adjustment movement will be created for any variance."
        onConfirm={() => handleApprove()}
        onCancel={() => {
          setShowApproveDialog(false);
          setCountToApprove(null);
        }}
        variant="info"
      />
    </div>
  );
};
