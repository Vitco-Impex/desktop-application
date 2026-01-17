/**
 * Variant Management Component - Manage product variants for an item
 */

import React, { useState, useEffect } from 'react';
import {
  inventoryService,
  InventoryVariant,
  CreateVariantRequest,
  UpdateVariantRequest,
} from '@/services/inventory.service';
import { Button, Input, Card, Select } from '@/shared/components/ui';
import { LoadingState, EmptyState, ErrorState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog } from '@/shared/components/modals';
import './VariantManagement.css';

interface VariantStock {
  variantId: string;
  totalOnHand: number;
  locations: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    quantity: number;
  }>;
}

interface VariantManagementProps {
  itemId: string;
  itemName: string;
  onVariantChange?: () => void;
}

export const VariantManagement: React.FC<VariantManagementProps> = ({
  itemId,
  itemName,
  onVariantChange,
}) => {
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [variantStock, setVariantStock] = useState<Record<string, VariantStock>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateVariantRequest>({
    itemId,
    code: '',
    name: '',
    isDefault: false,
    barcode: '',
    unitOfMeasureOverride: '',
  });

  useEffect(() => {
    if (itemId) {
      loadVariants();
      loadVariantStock();
    }
  }, [itemId]);

  const loadVariants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getVariantsByItem(itemId);
      setVariants(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load variants');
      setError(message);
      logger.error('[VariantManagement] Failed to load variants', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVariantStock = async () => {
    try {
      const stockData = await inventoryService.getVariantStock(itemId);
      const stockMap: Record<string, VariantStock> = {};
      stockData.forEach((stock) => {
        stockMap[stock.variantId] = stock;
      });
      setVariantStock(stockMap);
    } catch (err: any) {
      // Stock endpoint might not exist yet, ignore error
      logger.warn('[VariantManagement] Failed to load variant stock', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      setError('Code and name are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await inventoryService.createVariant(formData);
      setSuccess('Variant created successfully');
      setViewMode('list');
      resetForm();
      loadVariants();
      loadVariantStock();
      onVariantChange?.();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create variant');
      setError(message);
      logger.error('[VariantManagement] Failed to create variant', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedVariantId) {
      setError('No variant selected');
      return;
    }
    
    // Field-level validation
    const errors: string[] = [];
    
    if (!formData.code || formData.code.trim() === '') {
      errors.push('Variant code is required');
    } else if (formData.code.length > 100) {
      errors.push('Variant code must be 100 characters or less');
    }
    
    if (!formData.name || formData.name.trim() === '') {
      errors.push('Variant name is required');
    } else if (formData.name.length > 500) {
      errors.push('Variant name must be 500 characters or less');
    }
    
    if (formData.barcode && formData.barcode.length > 100) {
      errors.push('Barcode must be 100 characters or less');
    }
    
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updateData: UpdateVariantRequest = {
        code: formData.code,
        name: formData.name,
        isDefault: formData.isDefault,
        barcode: formData.barcode || undefined,
        unitOfMeasureOverride: formData.unitOfMeasureOverride || undefined,
      };

      await inventoryService.updateVariant(selectedVariantId, updateData);
      setSuccess('Variant updated successfully');
      setViewMode('list');
      resetForm();
      loadVariants();
      loadVariantStock();
      onVariantChange?.();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to update variant');
      setError(message);
      logger.error('[VariantManagement] Failed to update variant', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!variantToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await inventoryService.deleteVariant(variantToDelete);
      setSuccess('Variant deleted successfully');
      setShowDeleteConfirm(false);
      setVariantToDelete(null);
      loadVariants();
      loadVariantStock();
      onVariantChange?.();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete variant');
      setError(message);
      logger.error('[VariantManagement] Failed to delete variant', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant || variant.isDefault) return;

    setLoading(true);
    setError(null);
    try {
      // Unset current default
      const currentDefault = variants.find((v) => v.isDefault);
      if (currentDefault) {
        await inventoryService.updateVariant(currentDefault.id, { isDefault: false });
      }

      // Set new default
      await inventoryService.updateVariant(variantId, { isDefault: true });
      setSuccess('Default variant updated');
      loadVariants();
      onVariantChange?.();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to set default variant');
      setError(message);
      logger.error('[VariantManagement] Failed to set default variant', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (variant: InventoryVariant) => {
    setSelectedVariantId(variant.id);
    setFormData({
      itemId,
      code: variant.code,
      name: variant.name,
      isDefault: variant.isDefault,
      barcode: variant.barcode || '',
      unitOfMeasureOverride: variant.unitOfMeasureOverride || '',
    });
    setViewMode('edit');
  };

  const resetForm = () => {
    setFormData({
      itemId,
      code: '',
      name: '',
      isDefault: false,
      barcode: '',
      unitOfMeasureOverride: '',
    });
    setSelectedVariantId(null);
  };

  const renderList = () => (
    <div className="variant-management-list">
      <div className="variant-management-toolbar">
        <h3>Variants for {itemName}</h3>
        <Button variant="primary" onClick={() => {
          resetForm();
          setViewMode('create');
        }}>
          Add Variant
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <LoadingState message="Loading variants..." />
      ) : variants.length === 0 ? (
        <EmptyState message="No variants found. Create your first variant." />
      ) : (
        <div className="variant-table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Barcode</th>
                <th>Default</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const stock = variantStock[variant.id];
                return (
                  <tr key={variant.id}>
                    <td>{variant.code}</td>
                    <td>{variant.name}</td>
                    <td>{variant.barcode || '-'}</td>
                    <td>
                      {variant.isDefault ? (
                        <span className="badge badge-primary">Default</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(variant.id)}
                        >
                          Set Default
                        </Button>
                      )}
                    </td>
                    <td>
                      {stock ? (
                        <div className="stock-info">
                          <div className="stock-total">{stock.totalOnHand} total</div>
                          {stock.locations.length > 0 && (
                            <div className="stock-locations">
                              {stock.locations.slice(0, 2).map((loc) => (
                                <span key={loc.locationId} className="stock-location">
                                  {loc.locationCode}: {loc.quantity}
                                </span>
                              ))}
                              {stock.locations.length > 2 && (
                                <span className="stock-more">+{stock.locations.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className={variant.isActive ? 'status-active' : 'status-inactive'}>
                        {variant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(variant)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVariantToDelete(variant.id);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={variant.isDefault}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <Card className="variant-form">
      <h3>{viewMode === 'create' ? 'Create Variant' : 'Edit Variant'}</h3>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Variant Code *</label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="VARIANT-001"
          disabled={viewMode === 'edit'}
        />
      </div>

      <div className="form-group">
        <label>Variant Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Red - 32GB"
        />
      </div>

      <div className="form-group">
        <label>Barcode</label>
        <Input
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          placeholder="Optional barcode"
        />
      </div>

      <div className="form-group">
        <label>Unit of Measure Override</label>
        <Input
          value={formData.unitOfMeasureOverride}
          onChange={(e) => setFormData({ ...formData, unitOfMeasureOverride: e.target.value })}
          placeholder="Override item's unit of measure"
        />
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
          />
          Set as default variant
        </label>
      </div>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => {
          setViewMode('list');
          resetForm();
        }}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={viewMode === 'create' ? handleCreate : handleUpdate}
          disabled={loading}
        >
          {viewMode === 'create' ? 'Create' : 'Update'}
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="variant-management">
      {viewMode === 'list' && renderList()}
      {viewMode === 'create' && renderForm()}
      {viewMode === 'edit' && renderForm()}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Variant"
        message="Are you sure you want to delete this variant? This action cannot be undone. Make sure there is no stock associated with this variant."
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setVariantToDelete(null);
        }}
        variant="danger"
      />
    </div>
  );
};
