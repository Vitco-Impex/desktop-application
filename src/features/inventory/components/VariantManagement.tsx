/**
 * Variant Management Component - Manage product variants for an item
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  inventoryService,
  InventoryVariant,
  CreateVariantRequest,
  UpdateVariantRequest,
} from '@/services/inventory.service';
import { Button, Input, Tooltip } from '@/shared/components/ui';
import { DataTable, ColumnDef, FilterConfig } from '@/shared/components/data-display';
import { DropdownMenuItem } from '@/shared/components/ui';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog, SideDrawer } from '@/shared/components/modals';
import './VariantManagement.css';

interface VariantManagementProps {
  itemId: string;
  itemName: string;
  selectedVariantId?: string;
  onVariantChange?: () => void;
  onVariantSelect?: (variantId: string) => void;
}

export const VariantManagement: React.FC<VariantManagementProps> = ({
  itemId,
  itemName: _itemName, // Reserved for future use (e.g., aria-label, tooltip)
  selectedVariantId,
  onVariantChange,
  onVariantSelect,
}) => {
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [variantToDisable, setVariantToDisable] = useState<{ id: string; isActive: boolean } | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newlyCreatedVariantId, setNewlyCreatedVariantId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateVariantRequest>({
    itemId,
    code: '',
    name: '',
    isDefault: false,
    barcode: '',
  });

  useEffect(() => {
    if (itemId) {
      loadVariants();
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

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      setError('Code and name are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const createdVariant = await inventoryService.createVariant(formData);
      setSuccess('Variant created successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowDrawer(false);
      resetForm();
      await loadVariants();
      setNewlyCreatedVariantId(createdVariant.id);
      setTimeout(() => setNewlyCreatedVariantId(null), 2000);
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
    if (!editingVariantId) {
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
      };

      await inventoryService.updateVariant(editingVariantId, updateData);
      setSuccess('Variant updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowDrawer(false);
      resetForm();
      loadVariants();
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
      setTimeout(() => setSuccess(null), 3000);
      setShowDeleteConfirm(false);
      setVariantToDelete(null);
      loadVariants();
      onVariantChange?.();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete variant');
      setError(message);
      logger.error('[VariantManagement] Failed to delete variant', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!variantToDisable) return;

    setLoading(true);
    setError(null);
    try {
      // Check if variant is default and there are other variants
      const variant = variants.find((v) => v.id === variantToDisable.id);
      if (variant?.isDefault && variants.length > 1) {
        // Find another variant to set as default
        const otherVariant = variants.find((v) => !v.isDefault);
        if (otherVariant) {
          await inventoryService.updateVariant(otherVariant.id, { isDefault: true });
        }
      }

      await inventoryService.updateVariant(variantToDisable.id, { isActive: !variantToDisable.isActive });
      setSuccess(`Variant ${variantToDisable.isActive ? 'disabled' : 'enabled'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setShowDisableConfirm(false);
      setVariantToDisable(null);
      loadVariants();
      onVariantChange?.();
    } catch (err: any) {
      const message = extractErrorMessage(err, `Failed to ${variantToDisable.isActive ? 'disable' : 'enable'} variant`);
      setError(message);
      logger.error('[VariantManagement] Failed to disable/enable variant', err);
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
    setEditingVariantId(variant.id);
    setFormData({
      itemId,
      code: variant.code,
      name: variant.name,
      isDefault: variant.isDefault,
      barcode: variant.barcode || '',
    });
    setShowDrawer(true);
    setError(null);
  };

  const handleAddVariant = () => {
    resetForm();
    setShowDrawer(true);
    setError(null);
  };

  const handleCloseDrawer = () => {
    setShowDrawer(false);
    resetForm();
    setError(null);
  };

  const resetForm = () => {
    setFormData({
      itemId,
      code: '',
      name: '',
      isDefault: false,
      barcode: '',
    });
    setEditingVariantId(null);
  };

  // Parse variant attributes into tags
  const parseVariantAttributes = (variant: InventoryVariant): Array<{ key: string; value: string }> => {
    const tags: Array<{ key: string; value: string }> = [];
    
    if (variant.name) {
      tags.push({ key: 'Name', value: variant.name });
    }
    if (variant.barcode) {
      tags.push({ key: 'Barcode', value: variant.barcode });
    }
    if (variant.unitOfMeasureOverride) {
      tags.push({ key: 'UoM', value: variant.unitOfMeasureOverride });
    }
    
    // Add metadata fields
    if (variant.metadata) {
      Object.entries(variant.metadata).forEach(([key, value]) => {
        tags.push({ key, value: String(value) });
      });
    }
    
    return tags;
  };

  // Build action menu items for a variant
  const buildVariantActions = (variant: InventoryVariant): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [
      {
        id: 'edit',
        label: 'Edit',
        onClick: () => handleEdit(variant),
      },
    ];

    if (!variant.isDefault) {
      items.push({
        id: 'set-default',
        label: 'Set as Default',
        onClick: () => handleSetDefault(variant.id),
      });
    }

    items.push({
      id: 'toggle-status',
      label: variant.isActive ? 'Disable' : 'Enable',
      onClick: () => {
        if (variant.isDefault && variants.length > 1) {
          setError('Cannot disable the default variant. Set another variant as default first.');
          return;
        }
        setVariantToDisable({ id: variant.id, isActive: variant.isActive });
        setShowDisableConfirm(true);
      },
      disabled: variant.isDefault && variants.length > 1,
    });

    items.push({
      id: 'divider',
      divider: true,
      label: '',
      onClick: () => {},
    });

    items.push({
      id: 'delete',
      label: 'Delete',
      onClick: () => {
        setVariantToDelete(variant.id);
        setShowDeleteConfirm(true);
      },
      danger: true,
      disabled: variant.isDefault,
    });

    return items;
  };

  // Filter variants based on status (search is handled by DataTable)
  const filteredVariants = useMemo(() => {
    if (statusFilter === 'all') {
      return variants;
    }
    return variants.filter(v => 
      statusFilter === 'active' ? v.isActive : !v.isActive
    );
  }, [variants, statusFilter]);

  // Column definitions
  const columns: ColumnDef<InventoryVariant>[] = [
    {
      id: 'code',
      header: 'Code',
      width: 120,
      accessor: (variant) => (
        <span className="variant-code-cell" style={{ fontWeight: 600 }}>
          {variant.code}
        </span>
      ),
    },
    {
      id: 'attributes',
      header: 'Attributes',
      minWidth: 200,
      accessor: (variant) => {
        const tags = parseVariantAttributes(variant);
        const visibleTags = tags.slice(0, 4);
        const remainingCount = tags.length - 4;

        return (
          <div className="variant-attributes-cell">
            <div className="variant-attributes-tags">
              {visibleTags.map((tag, idx) => (
                <span key={idx} className="variant-attribute-tag">
                  [{tag.key}: {tag.value}]
                </span>
              ))}
              {remainingCount > 0 && (
                <Tooltip
                  content={
                    <div>
                      {tags.slice(4).map((tag, idx) => (
                        <div key={idx}>[{tag.key}: {tag.value}]</div>
                      ))}
                    </div>
                  }
                >
                  <span className="variant-attribute-more">+{remainingCount} more</span>
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      width: 100,
      accessor: (variant) => (
        <span className={`variant-status ${variant.isActive ? 'variant-status--active' : 'variant-status--inactive'}`}>
          <span className="variant-status-dot">{variant.isActive ? '●' : '○'}</span>
          <span>{variant.isActive ? 'Active' : 'Disabled'}</span>
        </span>
      ),
    },
    {
      id: 'default',
      header: 'Default',
      width: 60,
      align: 'center',
      accessor: (variant) => (
        <Tooltip content={variant.isDefault ? 'Default variant' : 'Set as default'}>
          <button
            className="variant-default-star"
            onClick={(e) => {
              e.stopPropagation();
              if (!variant.isDefault) {
                handleSetDefault(variant.id);
              }
            }}
            disabled={variant.isDefault}
            aria-label={variant.isDefault ? 'Default variant' : 'Set as default'}
          >
            {variant.isDefault ? '⭐' : '☆'}
          </button>
        </Tooltip>
      ),
    },
  ];

  // Status filter config
  const statusFilterConfig: FilterConfig = useMemo(() => {
    const activeCount = variants.filter(v => v.isActive).length;
    const inactiveCount = variants.filter(v => !v.isActive).length;

    return {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: `All (${variants.length})` },
        { value: 'active', label: `Active (${activeCount})` },
        { value: 'inactive', label: `Disabled (${inactiveCount})` },
      ],
    };
  }, [statusFilter, variants]);

  // Scroll to newly created or selected variant
  useEffect(() => {
    const targetId = newlyCreatedVariantId || selectedVariantId;
    if (targetId) {
      setTimeout(() => {
        const rowElement = document.querySelector(`[data-variant-id="${targetId}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [newlyCreatedVariantId, selectedVariantId]);

  const renderList = () => (
    <div className="variant-management-list">

      {/* Toolbar */}
      <div className="variant-management-toolbar">
        <h3>Variants</h3>
        <div className="variant-toolbar-actions">
          <Button variant="primary" onClick={handleAddVariant}>
            Add Variant
          </Button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <DataTable<InventoryVariant>
        data={filteredVariants}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search variants by code, name, or barcode..."
        searchFields={(variant) => [
          variant.code,
          variant.name,
          variant.barcode || '',
          variant.unitOfMeasureOverride || '',
        ]}
        filters={[statusFilterConfig]}
        actions={buildVariantActions}
        onRowClick={(variant) => onVariantSelect?.(variant.id)}
        onRowDoubleClick={handleEdit}
        selectedRowId={newlyCreatedVariantId || selectedVariantId || undefined}
        emptyMessage={variants.length === 0 
          ? "Add more variants if this product has multiple forms."
          : "No variants match your search/filter"}
        loading={loading}
        getRowId={(variant) => variant.id}
      />
    </div>
  );

  const renderForm = () => (
    <div className="variant-form">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Variant Code *</label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="VARIANT-001"
          disabled={!!editingVariantId}
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
        <Button variant="secondary" onClick={handleCloseDrawer}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={editingVariantId ? handleUpdate : handleCreate}
          disabled={loading}
        >
          {editingVariantId ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="variant-management">
      {renderList()}

      <SideDrawer
        isOpen={showDrawer}
        onClose={handleCloseDrawer}
        title={editingVariantId ? 'Edit Variant' : 'Add Variant'}
        width="480px"
      >
        {renderForm()}
      </SideDrawer>

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

      <ConfirmDialog
        isOpen={showDisableConfirm}
        title={variantToDisable?.isActive ? 'Disable Variant' : 'Enable Variant'}
        message={`Are you sure you want to ${variantToDisable?.isActive ? 'disable' : 'enable'} this variant?`}
        onConfirm={handleDisable}
        onCancel={() => {
          setShowDisableConfirm(false);
          setVariantToDisable(null);
        }}
        variant="warning"
      />
    </div>
  );
};
