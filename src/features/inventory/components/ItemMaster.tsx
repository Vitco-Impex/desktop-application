/**
 * Item Master Component - Manage inventory items
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  inventoryService,
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  IndustryType,
} from '@/services/inventory.service';
import { Button, Input, Card, Select, ImageUpload, ImageData } from '@/shared/components/ui';
import { LoadingState, EmptyState, ErrorState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog } from '@/shared/components/modals';
import { VariantManagement } from './VariantManagement';
import './ItemMaster.css';

type ViewMode = 'list' | 'details' | 'add' | 'edit';

export const ItemMaster: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterIndustryType, setFilterIndustryType] = useState<string>('');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('');
  const [filterExpiryRisk, setFilterExpiryRisk] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [addingVariantForItem, setAddingVariantForItem] = useState<string | null>(null);
  const [variantFormData, setVariantFormData] = useState<{
    code: string;
    name: string;
    barcode: string;
    isDefault: boolean;
    images: ImageData[];
  }>({
    code: '',
    name: '',
    barcode: '',
    isDefault: false,
    images: [],
  });
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemSubTab, setItemSubTab] = useState<'overview' | 'stock' | 'tracking' | 'locations' | 'history' | 'variants'>('overview');
  const [trackingSubView, setTrackingSubView] = useState<'batches' | 'serials' | 'expiry'>('batches');
  
  // Auto-set tracking sub-view when item changes
  useEffect(() => {
    if (selectedItem && itemSubTab === 'tracking') {
      if (selectedItem.industryFlags.requiresBatchTracking) {
        setTrackingSubView('batches');
      } else if (selectedItem.industryFlags.requiresSerialTracking) {
        setTrackingSubView('serials');
      } else if (selectedItem.industryFlags.hasExpiryDate) {
        setTrackingSubView('expiry');
      }
    }
  }, [selectedItem, itemSubTab]);
  const [stockData, setStockData] = useState<Array<{
    locationId: string;
    location: {
      id: string;
      code: string;
      name: string;
      type: string;
    };
    variantId?: string;
    batchNumber?: string;
    serialNumber?: string;
    onHandQuantity: number;
    reservedQuantity: number;
    blockedQuantity: number;
    damagedQuantity: number;
    availableQuantity: number;
    expiryDate?: string;
  }>>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyFilters, setHistoryFilters] = useState({ dateFrom: '', dateTo: '', movementType: '', locationId: '' });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [variantStock, setVariantStock] = useState<Array<{
    variantId: string;
    totalOnHand: number;
    locations: Array<{
      locationId: string;
      locationCode: string;
      locationName: string;
      quantity: number;
    }>;
  }>>([]);
  
  // Batch management state
  const [batches, setBatches] = useState<any[]>([]);
  const [nearExpiryBatches, setNearExpiryBatches] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchViewMode, setBatchViewMode] = useState<'list' | 'create' | 'fefo'>('list');
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });
  const [fefoForm, setFefoForm] = useState({
    locationId: '',
    quantity: 0,
  });
  const [fefoResult, setFefoResult] = useState<any[]>([]);
  const [showBatchDisposeDialog, setShowBatchDisposeDialog] = useState(false);
  const [batchToDispose, setBatchToDispose] = useState<{ batchNumber: string; itemId: string } | null>(null);
  const [disposeReason, setDisposeReason] = useState('');
  
  // Serial lookup state
  const [serials, setSerials] = useState<any[]>([]);
  const [serialSearchInput, setSerialSearchInput] = useState('');
  const [selectedSerial, setSelectedSerial] = useState<any | null>(null);
  const [serialHistory, setSerialHistory] = useState<any[]>([]);
  const [serialLoading, setSerialLoading] = useState(false);
  
  // Expiry monitoring state
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [expiryDaysAhead, setExpiryDaysAhead] = useState(30);
  const [expiryLoading, setExpiryLoading] = useState(false);
  
  // Locations for batch operations
  const [locations, setLocations] = useState<Array<{ id: string; code: string; name: string }>>([]);
  
  // Stock summary for inline expansion
  const [itemStockSummaries, setItemStockSummaries] = useState<Record<string, {
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
    locationCount: number;
  }>>({});
  
  // Expiry alerts for filtering
  const [expiryAlertsMap, setExpiryAlertsMap] = useState<Record<string, {
    daysUntilExpiry: number;
    expiryStatus: string;
  }>>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<CreateInventoryItemRequest>({
    sku: '',
    name: '',
    description: '',
    category: '',
    barcode: '',
    unitOfMeasure: 'pcs',
    unitConversions: [],
    industryFlags: {
      isPerishable: false,
      requiresBatchTracking: false,
      requiresSerialTracking: false,
      hasExpiryDate: false,
      industryType: IndustryType.WAREHOUSE,
    },
    images: [],
    costPrice: undefined,
    sellingPrice: undefined,
    margin: undefined,
    supplierId: undefined,
    supplierName: '',
    supplierCode: '',
    dimensions: undefined,
    weight: undefined,
    tags: [],
  });

  // Variants in form state
  const [formVariants, setFormVariants] = useState<Array<CreateVariantRequest & { tempId: string }>>([]);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  
  // Wizard step state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Ref to track if we've processed the edit param
  const editParamProcessed = useRef(false);
  
  // Wizard steps configuration
  const wizardSteps = [
    { id: 1, label: 'Basic Info', key: 'basic' },
    { id: 2, label: 'Images', key: 'images' },
    { id: 3, label: 'Pricing', key: 'pricing' },
    { id: 4, label: 'Dimensions', key: 'dimensions' },
    { id: 5, label: 'Industry', key: 'industry' },
    { id: 6, label: 'Stock', key: 'stock' },
    { id: 7, label: 'Variants', key: 'variants' },
    { id: 8, label: 'Tags', key: 'tags' },
  ];

  // Initial load on mount
  useEffect(() => {
    loadItems();
    loadCategories();
    
    // Cleanup success timeout on unmount
    return () => {
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
    };
  }, []); // Only run on mount

  // Handle edit param from URL - check after items are loaded
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !editParamProcessed.current && items.length > 0) {
      const itemToEdit = items.find(i => i.id === editId);
      if (itemToEdit) {
        editParamProcessed.current = true;
        setSelectedItemId(editId);
        setViewMode('details');
        setSearchParams({}, { replace: true });
      }
    }
    
    // Reset the ref when searchParams change (new edit param)
    if (!searchParams.get('edit')) {
      editParamProcessed.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), items.length]); // Only check when searchParams or items length changes

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Esc to cancel inline editing
        if (e.key === 'Escape' && editingField) {
          cancelInlineEdit();
        }
        return;
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Ctrl/Cmd + N: New item (only in list view)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && viewMode === 'list') {
        e.preventDefault();
        setViewMode('add');
      }

      // Esc: Cancel edit mode or deselect item
      if (e.key === 'Escape') {
        if (viewMode === 'edit' || viewMode === 'add') {
          setViewMode('list');
          setFieldErrors({});
        } else if (viewMode === 'details' && selectedItemId) {
          setSelectedItemId(null);
          setViewMode('list');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewMode, selectedItemId, editingField]);

  useEffect(() => {
    if (viewMode === 'list') {
      loadItems();
    }
  }, [viewMode, searchTerm, filterCategory, filterIndustryType, filterStockStatus, filterExpiryRisk, sortColumn, sortDirection]);

  useEffect(() => {
    if (selectedItemId && viewMode === 'details') {
      loadItemDetails();
    }
  }, [selectedItemId, viewMode]);

  useEffect(() => {
    // Reload data when sub-tab changes for selected item
    if (selectedItemId && selectedItem && viewMode === 'details') {
      if (itemSubTab === 'batches' && selectedItem.industryFlags.requiresBatchTracking) {
        loadBatches(selectedItemId);
      } else if (itemSubTab === 'serials' && selectedItem.industryFlags.requiresSerialTracking) {
        loadSerials(selectedItemId);
      } else if (itemSubTab === 'expiry' && selectedItem.industryFlags.hasExpiryDate) {
        loadExpiryAlerts(selectedItemId);
      } else if (itemSubTab === 'variants' && selectedItem.hasVariants) {
        loadVariants(selectedItemId);
        loadVariantStock(selectedItemId);
      }
    }
  }, [itemSubTab, selectedItemId]);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await inventoryService.getAllItems({
        search: searchTerm || undefined,
        category: filterCategory || undefined,
      });
      
      // Load stock summaries and expiry alerts if needed for filtering
      if (filterStockStatus || filterExpiryRisk) {
        const [summaries, expiryAlerts] = await Promise.all([
          loadItemStockSummaries(data),
          filterExpiryRisk ? loadExpiryAlertsForFiltering() : Promise.resolve([]),
        ]);
        
        // Build expiry alerts map
        const alertsMap: Record<string, { daysUntilExpiry: number; expiryStatus: string }> = {};
        expiryAlerts.forEach((alert: any) => {
          if (!alertsMap[alert.itemId] || alertsMap[alert.itemId].daysUntilExpiry > alert.daysUntilExpiry) {
            alertsMap[alert.itemId] = {
              daysUntilExpiry: alert.daysUntilExpiry,
              expiryStatus: alert.expiryStatus,
            };
          }
        });
        setExpiryAlertsMap(alertsMap);
      } else {
        // Load stock summaries in background for inline expansion
        loadItemStockSummaries(data).catch((err) => {
          logger.error('[ItemMaster] Failed to load stock summaries', err);
        });
      }
      
      // Apply client-side filters
      if (filterIndustryType) {
        data = data.filter((item) => item.industryFlags.industryType === filterIndustryType);
      }
      if (filterStockStatus) {
        data = data.filter((item) => {
          const summary = itemStockSummaries[item.id];
          if (!summary) return false;
          
          switch (filterStockStatus) {
            case 'in-stock':
              return summary.totalOnHand > 0;
            case 'low-stock':
              return summary.totalOnHand > 0 && 
                     item.reorderPoint !== undefined && 
                     summary.totalOnHand < item.reorderPoint;
            case 'out-of-stock':
              return summary.totalOnHand === 0;
            default:
              return true;
          }
        });
      }
      if (filterExpiryRisk) {
        data = data.filter((item) => {
          const alert = expiryAlertsMap[item.id];
          if (!alert) return false;
          
          switch (filterExpiryRisk) {
            case 'expired':
              return alert.daysUntilExpiry < 0;
            case 'critical':
              return alert.daysUntilExpiry >= 0 && alert.daysUntilExpiry <= 7;
            case 'warning':
              return alert.daysUntilExpiry > 7 && alert.daysUntilExpiry <= 30;
            default:
              return true;
          }
        });
      }
      
      // Apply sorting
      if (sortColumn) {
        data = [...data].sort((a, b) => {
          let aVal: any;
          let bVal: any;
          
          switch (sortColumn) {
            case 'sku':
              aVal = a.sku.toLowerCase();
              bVal = b.sku.toLowerCase();
              break;
            case 'name':
              aVal = a.name.toLowerCase();
              bVal = b.name.toLowerCase();
              break;
            case 'category':
              aVal = (a.category || '').toLowerCase();
              bVal = (b.category || '').toLowerCase();
              break;
            case 'unit':
              aVal = a.unitOfMeasure.toLowerCase();
              bVal = b.unitOfMeasure.toLowerCase();
              break;
            case 'industry':
              aVal = a.industryFlags.industryType.toLowerCase();
              bVal = b.industryFlags.industryType.toLowerCase();
              break;
            case 'status':
              aVal = a.isActive ? 1 : 0;
              bVal = b.isActive ? 1 : 0;
              break;
            default:
              return 0;
          }
          
          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      setItems(data);
      // Reset to first page when filters change
      setCurrentPage(1);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load items');
      setError(message);
      logger.error('[ItemMaster] Failed to load items', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadExpiryAlertsForFiltering = async () => {
    try {
      const alerts = await inventoryService.getExpiryAlerts(30);
      return alerts;
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load expiry alerts for filtering', err);
      return [];
    }
  };

  const loadItemDetails = async () => {
    if (!selectedItemId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getItemById(selectedItemId);
      setSelectedItem(data);
      
      // Load variants and variant stock if item has variants
      if (data.hasVariants) {
        await Promise.all([
          loadVariants(selectedItemId),
          loadVariantStock(selectedItemId),
        ]);
      } else {
        setVariants([]);
        setVariantStock([]);
      }
      
      // Load batches if item requires batch tracking
      if (data.industryFlags.requiresBatchTracking) {
        await loadBatches(selectedItemId);
      }
      
      // Load serials if item requires serial tracking
      if (data.industryFlags.requiresSerialTracking) {
        await loadSerials(selectedItemId);
      }
      
      // Load expiry alerts if item has expiry date
      if (data.industryFlags.hasExpiryDate) {
        await loadExpiryAlerts();
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load item details');
      setError(message);
      logger.error('[ItemMaster] Failed to load item details', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadBatches = async (itemId: string) => {
    setBatchLoading(true);
    try {
      const data = await inventoryService.getBatchesByItem(itemId);
      setBatches(data);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load batches', err);
      setBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!selectedItemId || !batchForm.batchNumber) {
      setError('Batch number is required');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.createBatch({
        batchNumber: batchForm.batchNumber,
        itemId: selectedItemId,
        manufacturingDate: batchForm.manufacturingDate,
        expiryDate: batchForm.expiryDate || undefined,
      });
      setSuccess('Batch created successfully');
      setBatchViewMode('list');
      setBatchForm({
        batchNumber: '',
        manufacturingDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
      });
      await loadBatches(selectedItemId);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create batch');
      setError(message);
      logger.error('[ItemMaster] Failed to create batch', err);
    }
  };

  const handleDisposeBatch = async (reason?: string) => {
    if (!batchToDispose || !reason || !selectedItemId) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.disposeBatch(batchToDispose.batchNumber, batchToDispose.itemId, reason);
      setSuccess('Batch disposed successfully');
      setShowBatchDisposeDialog(false);
      setBatchToDispose(null);
      setDisposeReason('');
      await loadBatches(selectedItemId);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to dispose batch');
      setError(message);
      logger.error('[ItemMaster] Failed to dispose batch', err);
    }
  };

  const handleFEFO = async () => {
    if (!selectedItemId || !fefoForm.locationId || !fefoForm.quantity) {
      setError('Location and quantity are required for FEFO');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const result = await inventoryService.getFEFOStock(
        selectedItemId,
        fefoForm.locationId,
        fefoForm.quantity
      );
      setFefoResult(result);
      setSuccess('FEFO allocation calculated successfully');
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to calculate FEFO allocation');
      setError(message);
      logger.error('[ItemMaster] Failed to calculate FEFO', err);
    }
  };
  
  const loadSerials = async (itemId: string) => {
    setSerialLoading(true);
    try {
      const data = await inventoryService.getSerialsByItem(itemId);
      setSerials(data);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load serials', err);
      setSerials([]);
    } finally {
      setSerialLoading(false);
    }
  };
  
  const loadExpiryAlerts = async (itemId?: string) => {
    setExpiryLoading(true);
    try {
      const alerts = await inventoryService.getExpiryAlerts(expiryDaysAhead);
      // Filter by itemId if provided
      const filteredAlerts = itemId ? alerts.filter((alert) => alert.itemId === itemId) : alerts;
      setExpiryAlerts(filteredAlerts);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load expiry alerts', err);
      setExpiryAlerts([]);
    } finally {
      setExpiryLoading(false);
    }
  };

  useEffect(() => {
    // Reload history when filters change
    if (itemSubTab === 'history' && selectedItemId) {
      loadHistoryData(selectedItemId);
    }
  }, [historyFilters, itemSubTab, selectedItemId]);
  
  const handleSerialSearch = async () => {
    if (!serialSearchInput.trim()) {
      setError('Please enter a serial number');
      return;
    }
    
    setSerialLoading(true);
    setError(null);
    try {
      const serialData = await inventoryService.getSerialByNumber(serialSearchInput.trim());
      setSelectedSerial(serialData);
      
      // Load history
      try {
        const historyData = await inventoryService.getSerialHistory(serialSearchInput.trim());
        setSerialHistory(historyData);
      } catch (err: any) {
        logger.warn('[ItemMaster] Failed to load serial history', err);
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to find serial number');
      setError(message);
      logger.error('[ItemMaster] Failed to search serial', err);
    } finally {
      setSerialLoading(false);
    }
  };

  const loadVariants = async (itemId: string) => {
    try {
      const data = await inventoryService.getVariantsByItem(itemId);
      setVariants(data);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load variants', err);
      setVariants([]);
    }
  };

  const loadVariantStock = async (itemId: string) => {
    try {
      const data = await inventoryService.getVariantStock(itemId);
      setVariantStock(data);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load variant stock', err);
      setVariantStock([]);
    }
  };

  const loadItemStockSummaries = async (items: InventoryItem[]): Promise<Record<string, {
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
    locationCount: number;
  }>> => {
    try {
      const summaries: Record<string, {
        totalOnHand: number;
        totalReserved: number;
        totalAvailable: number;
        locationCount: number;
      }> = {};
      
      // Load stock summaries for all items in parallel (limit to first 100 for performance)
      const itemsToLoad = items.slice(0, 100);
      await Promise.all(
        itemsToLoad.map(async (item) => {
          try {
            const stockData = await inventoryService.getStockByItem(item.id);
            const totalOnHand = stockData.reduce((sum, s) => sum + s.onHandQuantity, 0);
            const totalReserved = stockData.reduce((sum, s) => sum + s.reservedQuantity, 0);
            const totalAvailable = stockData.reduce((sum, s) => sum + s.availableQuantity, 0);
            const locationCount = new Set(stockData.map(s => s.locationId)).size;
            
            summaries[item.id] = {
              totalOnHand,
              totalReserved,
              totalAvailable,
              locationCount,
            };
          } catch (err) {
            // Ignore errors for individual items
            summaries[item.id] = {
              totalOnHand: 0,
              totalReserved: 0,
              totalAvailable: 0,
              locationCount: 0,
            };
          }
        })
      );
      
      setItemStockSummaries(summaries);
      return summaries;
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load stock summaries', err);
      return {};
    }
  };

  const toggleRowExpand = async (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      // Load variants for this item if it has variants
      const item = items.find(i => i.id === itemId);
      if (item?.hasVariants) {
        try {
          await loadVariants(itemId);
        } catch (err) {
          logger.error('[ItemMaster] Failed to load variants for expanded row', err);
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const pageItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    if (selectedItems.size === pageItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pageItems.map(item => item.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedItems.size === 0) return;
    
    setBulkActionLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const itemIds = Array.from(selectedItems);
      
      if (action === 'delete') {
        // Show confirmation dialog
        if (!window.confirm(`Are you sure you want to delete ${itemIds.length} item(s)? This action cannot be undone.`)) {
          setBulkActionLoading(false);
          return;
        }
        
        await Promise.all(itemIds.map(id => inventoryService.deleteItem(id)));
        setSuccess(`${itemIds.length} item(s) deleted successfully`);
      } else {
        const isActive = action === 'activate';
        await Promise.all(itemIds.map(id => inventoryService.updateItem(id, { isActive })));
        setSuccess(`${itemIds.length} item(s) ${action === 'activate' ? 'activated' : 'deactivated'} successfully`);
      }
      
      clearSuccessMessage();
      setSelectedItems(new Set());
      await loadItems();
      if (selectedItemId && itemIds.includes(selectedItemId)) {
        await loadItemDetails();
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, `Failed to ${action} items`);
      setError(message);
      logger.error('[ItemMaster] Failed to perform bulk action', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = items.map(item => ({
      SKU: item.sku,
      Name: item.name,
      Category: item.category || '',
      'Unit of Measure': item.unitOfMeasure,
      Industry: item.industryFlags.industryType,
      Status: item.isActive ? 'Active' : 'Inactive',
      'Min Stock Level': item.minStockLevel || '',
      'Max Stock Level': item.maxStockLevel || '',
      'Reorder Point': item.reorderPoint || '',
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header as keyof typeof row];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `items_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadStockData = async (itemId: string) => {
    try {
      const data = await inventoryService.getStockByItem(itemId);
      setStockData(data);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load stock data', err);
      setStockData([]);
    }
  };

  const loadHistoryData = async (itemId: string) => {
    try {
      const filters: any = { itemId };
      if (historyFilters.dateFrom) filters.dateFrom = historyFilters.dateFrom;
      if (historyFilters.dateTo) filters.dateTo = historyFilters.dateTo;
      if (historyFilters.movementType) filters.movementType = historyFilters.movementType;
      if (historyFilters.locationId) filters.fromLocationId = historyFilters.locationId;
      const data = await inventoryService.getAllMovements(filters);
      setHistoryData(data);
    } catch (err: any) {
      logger.error('[ItemMaster] Failed to load history data', err);
      setHistoryData([]);
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const loadCategories = async () => {
    try {
      const data = await inventoryService.getCategories();
      setCategories(data);
    } catch (err) {
      logger.error('[ItemMaster] Failed to load categories', err);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    // SKU validation
    if (!formData.sku?.trim()) {
      errors.push('SKU is required');
      newFieldErrors.sku = 'SKU is required';
    } else if (!/^[A-Z0-9-_]+$/.test(formData.sku)) {
      errors.push('SKU must contain only uppercase letters, numbers, hyphens, and underscores');
      newFieldErrors.sku = 'SKU must contain only uppercase letters, numbers, hyphens, and underscores';
    }

    // Name validation
    if (!formData.name?.trim()) {
      errors.push('Name is required');
      newFieldErrors.name = 'Name is required';
    } else if (formData.name.trim().length > 500) {
      errors.push('Name must be 500 characters or less');
      newFieldErrors.name = 'Name must be 500 characters or less';
    }

    // Unit of Measure validation
    if (!formData.unitOfMeasure?.trim()) {
      errors.push('Unit of Measure is required');
      newFieldErrors.unitOfMeasure = 'Unit of Measure is required';
    }

    // Stock level validations
    if (formData.minStockLevel !== undefined && formData.minStockLevel < 0) {
      errors.push('Min Stock Level cannot be negative');
      newFieldErrors.minStockLevel = 'Min Stock Level cannot be negative';
    }
    if (formData.maxStockLevel !== undefined && formData.maxStockLevel < 0) {
      errors.push('Max Stock Level cannot be negative');
      newFieldErrors.maxStockLevel = 'Max Stock Level cannot be negative';
    }
    if (formData.reorderPoint !== undefined && formData.reorderPoint < 0) {
      errors.push('Reorder Point cannot be negative');
      newFieldErrors.reorderPoint = 'Reorder Point cannot be negative';
    }
    if (formData.minStockLevel !== undefined && formData.maxStockLevel !== undefined && 
        formData.minStockLevel > formData.maxStockLevel) {
      errors.push('Min Stock Level cannot be greater than Max Stock Level');
      newFieldErrors.minStockLevel = 'Min Stock Level cannot be greater than Max Stock Level';
      newFieldErrors.maxStockLevel = 'Max Stock Level must be greater than Min Stock Level';
    }

    // Unit conversions validation
    if (formData.unitConversions && formData.unitConversions.length > 0) {
      formData.unitConversions.forEach((conv, index) => {
        if (!conv.fromUnit?.trim() || !conv.toUnit?.trim()) {
          errors.push(`Unit conversion ${index + 1}: From and To units are required`);
          newFieldErrors[`unitConversion_${index}`] = 'From and To units are required';
        }
        if (conv.conversionFactor <= 0) {
          errors.push(`Unit conversion ${index + 1}: Conversion factor must be greater than 0`);
          newFieldErrors[`unitConversion_${index}`] = 'Conversion factor must be greater than 0';
        }
      });
    }

    setFieldErrors(newFieldErrors);
    return errors;
  };

  const clearSuccessMessage = () => {
    if (successTimeout) {
      clearTimeout(successTimeout);
    }
    const timeout = setTimeout(() => {
      setSuccess(null);
    }, 5000); // Show success message for 5 seconds
    setSuccessTimeout(timeout);
  };

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    // Validate form before submission
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    // Validate variants if any
    if (formVariants.length > 0) {
      const variantErrors: string[] = [];
      const variantCodes = new Set<string>();
      formVariants.forEach((variant, index) => {
        if (!variant.code || !variant.name) {
          variantErrors.push(`Variant ${index + 1}: Code and name are required`);
        }
        if (variantCodes.has(variant.code)) {
          variantErrors.push(`Variant ${index + 1}: Duplicate variant code`);
        }
        variantCodes.add(variant.code);
      });
      if (variantErrors.length > 0) {
        setError(variantErrors.join('. '));
        return;
      }
    }

    try {
      // Create item first
      const createdItem = await inventoryService.createItem(formData);
      setSuccess('Item created successfully');
      
      // Create variants if any
      if (formVariants.length > 0) {
        try {
          const variantPromises = formVariants.map(variant => {
            const { tempId, ...variantData } = variant;
            return inventoryService.createVariant({
              ...variantData,
              itemId: createdItem.id,
            });
          });
          await Promise.all(variantPromises);
          setSuccess('Item and variants created successfully');
        } catch (variantErr: any) {
          logger.error('[ItemMaster] Failed to create variants', variantErr);
          setError(`Item created but failed to create some variants: ${extractErrorMessage(variantErr, 'Variant creation failed')}`);
        }
      }
      
      clearSuccessMessage();
      setViewMode('list');
      setFieldErrors({});
      setFormVariants([]);
      setEditingVariantIndex(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: '',
        barcode: '',
        unitOfMeasure: 'pcs',
        unitConversions: [],
        industryFlags: {
          isPerishable: false,
          requiresBatchTracking: false,
          requiresSerialTracking: false,
          hasExpiryDate: false,
          industryType: IndustryType.WAREHOUSE,
        },
        images: [],
        costPrice: undefined,
        sellingPrice: undefined,
        margin: undefined,
        supplierId: undefined,
        supplierName: '',
        supplierCode: '',
        dimensions: undefined,
        weight: undefined,
        tags: [],
      });
      loadItems();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create item');
      setError(message);
      logger.error('[ItemMaster] Failed to create item', err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItemId) return;
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    // Validate form before submission
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    try {
      const updateData: UpdateInventoryItemRequest = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        barcode: formData.barcode,
        unitOfMeasure: formData.unitOfMeasure,
        unitConversions: formData.unitConversions,
        industryFlags: formData.industryFlags,
        minStockLevel: formData.minStockLevel,
        maxStockLevel: formData.maxStockLevel,
        reorderPoint: formData.reorderPoint,
        images: formData.images,
        costPrice: formData.costPrice,
        sellingPrice: formData.sellingPrice,
        margin: formData.margin,
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        supplierCode: formData.supplierCode,
        dimensions: formData.dimensions,
        weight: formData.weight,
        tags: formData.tags,
      };
      await inventoryService.updateItem(selectedItemId, updateData);
      setSuccess('Item updated successfully');
      clearSuccessMessage();
      setViewMode('list');
      setFieldErrors({});
      loadItems();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to update item');
      setError(message);
      logger.error('[ItemMaster] Failed to update item', err);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.deleteItem(itemToDelete);
      setSuccess('Item deleted successfully');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      if (selectedItemId === itemToDelete) {
        setViewMode('list');
        setSelectedItemId(null);
      }
      loadItems();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete item');
      setError(message);
      logger.error('[ItemMaster] Failed to delete item', err);
    }
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    setFormData({
      sku: selectedItem.sku,
      name: selectedItem.name,
      description: selectedItem.description || '',
      category: selectedItem.category || '',
      barcode: (selectedItem as any).barcode || '',
      unitOfMeasure: selectedItem.unitOfMeasure,
      unitConversions: selectedItem.unitConversions,
      industryFlags: selectedItem.industryFlags,
      minStockLevel: selectedItem.minStockLevel,
      maxStockLevel: selectedItem.maxStockLevel,
      reorderPoint: selectedItem.reorderPoint,
      images: selectedItem.images || [],
      costPrice: selectedItem.costPrice,
      sellingPrice: selectedItem.sellingPrice,
      margin: selectedItem.margin,
      supplierId: selectedItem.supplierId,
      supplierName: selectedItem.supplierName || '',
      supplierCode: selectedItem.supplierCode || '',
      dimensions: selectedItem.dimensions,
      weight: selectedItem.weight,
      tags: selectedItem.tags || [],
    });
    setFormVariants([]);
    setEditingVariantIndex(null);
    setViewMode('edit');
  };

  const handleDuplicateItem = (item: InventoryItem) => {
    // Generate new SKU by appending timestamp or counter
    const timestamp = Date.now().toString().slice(-6);
    const newSku = `${item.sku}-COPY-${timestamp}`;
    
    setFormData({
      sku: newSku,
      name: `${item.name} (Copy)`,
      description: item.description || '',
      category: item.category || '',
      barcode: '',
      unitOfMeasure: item.unitOfMeasure,
      unitConversions: item.unitConversions || [],
      industryFlags: item.industryFlags,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      reorderPoint: item.reorderPoint,
    });
    setHasUnsavedChanges(false);
    setFieldErrors({});
    setViewMode('add');
  };

  const renderList = () => (
    <div className="item-master-list">
      {/* Top section: Search and Add Button */}
      <div className="item-master-top-section">
        <div className="item-master-search-section">
          <Input
            placeholder="Search items... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '300px' }}
            id="item-search-input"
          />
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
        <div className="item-master-add-section">
          <Button variant="primary" onClick={() => setViewMode('add')} title="Add Item (Ctrl+N)">
            Add Item
          </Button>
        </div>
      </div>

      {/* Toolbar section: Bulk actions and export */}
      {(selectedItems.size > 0 || true) && (
        <div className="item-master-toolbar">
          <div className="item-master-actions">
            {selectedItems.size > 0 && (
              <div className="bulk-actions-bar">
                <span className="bulk-selection-count">{selectedItems.size} selected</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                >
                  Activate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                >
                  Deactivate
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionLoading}
                >
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
            <Button variant="ghost" onClick={handleExportCSV} title="Export to CSV">
              Export CSV
            </Button>
          </div>
        </div>
      )}
      
      <div className="item-master-list-content">
      {showFilters && (
        <div className="filter-bar-expanded">
          <div className="filter-row">
            <div className="filter-group">
              <label>Industry Type</label>
              <Select
                value={filterIndustryType}
                onChange={(e) => setFilterIndustryType(e.target.value)}
                style={{ width: '200px' }}
              >
                <option value="">All Industries</option>
                {Object.values(IndustryType).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="filter-group">
              <label>Stock Status</label>
              <Select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value)}
                style={{ width: '200px' }}
              >
                <option value="">All Statuses</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </Select>
            </div>
            <div className="filter-group">
              <label>Expiry Risk</label>
              <Select
                value={filterExpiryRisk}
                onChange={(e) => setFilterExpiryRisk(e.target.value)}
                style={{ width: '200px' }}
              >
                <option value="">All</option>
                <option value="expired">Expired</option>
                <option value="critical">Critical (0-7 days)</option>
                <option value="warning">Warning (8-30 days)</option>
              </Select>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setFilterIndustryType('');
                setFilterStockStatus('');
                setFilterExpiryRisk('');
                setFilterCategory('');
                setSearchTerm('');
              }}
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <div className="loading-skeleton" style={{ padding: '20px' }}>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <EmptyState message="No items found" />
        </div>
      ) : (
        <>
        <div className="item-master-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.size > 0 && selectedItems.size === items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length}
                    onChange={handleSelectAll}
                    title="Select all"
                  />
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('sku')}
                  style={{ cursor: 'pointer' }}
                >
                  SKU
                  {sortColumn === 'sku' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer' }}
                >
                  Name
                  {sortColumn === 'name' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('category')}
                  style={{ cursor: 'pointer' }}
                >
                  Category
                  {sortColumn === 'category' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('unit')}
                  style={{ cursor: 'pointer' }}
                >
                  Unit
                  {sortColumn === 'unit' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('industry')}
                  style={{ cursor: 'pointer' }}
                >
                  Industry
                  {sortColumn === 'industry' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('status')}
                  style={{ cursor: 'pointer' }}
                >
                  Status
                  {sortColumn === 'status' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
                const isExpanded = expandedRows.has(item.id);
                const stockSummary = itemStockSummaries[item.id];
                const itemVariants = variants.filter(v => v.itemId === item.id);
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`expandable-row ${selectedItemId === item.id ? 'selected-row' : ''}`}
                      onClick={() => {
                        navigate(`/inventory/products/${item.id}`);
                      }}
                      style={{ cursor: 'pointer', backgroundColor: selectedItemId === item.id ? '#f0f7ff' : 'transparent' }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </td>
                      <td>
                        <div className="expandable-row-header">
                          <span
                            className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpand(item.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            ▶
                          </span>
                          {item.sku}
                        </div>
                      </td>
                      <td>{item.name}</td>
                      <td>{item.category || '-'}</td>
                      <td>{item.unitOfMeasure}</td>
                      <td>{item.industryFlags.industryType}</td>
                      <td>
                        <span className={item.isActive ? 'status-active' : 'status-inactive'}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setViewMode('details');
                            }}
                            title="View Details"
                          >
                            View
                          </Button>
                          {item.industryFlags.requiresBatchTracking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                                setViewMode('details');
                                setItemSubTab('batches');
                              }}
                              title="View Batches"
                            >
                              Batches
                            </Button>
                          )}
                          {item.industryFlags.requiresSerialTracking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                                setViewMode('details');
                                setItemSubTab('serials');
                              }}
                              title="View Serials"
                            >
                              Serials
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item.id);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete Item"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="expanded-content">
                          <div className="expanded-variants-container">
                            <div className="expanded-variants-header">
                              <h4>Variants</h4>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (addingVariantForItem === item.id) {
                                    setAddingVariantForItem(null);
                                    setVariantFormData({ code: '', name: '', barcode: '', isDefault: false, images: [] });
                                  } else {
                                    setAddingVariantForItem(item.id);
                                    setVariantFormData({ code: '', name: '', barcode: '', isDefault: false, images: [] });
                                  }
                                }}
                              >
                                {addingVariantForItem === item.id ? 'Cancel' : '+ Add New Variant'}
                              </Button>
                            </div>

                            {/* Add Variant Form */}
                            {addingVariantForItem === item.id && (
                              <div className="add-variant-form" onClick={(e) => e.stopPropagation()}>
                                <div className="variant-form-grid">
                                  <div className="variant-form-field">
                                    <label>Variant Code *</label>
                                    <Input
                                      placeholder="e.g., RED-32GB"
                                      value={variantFormData.code}
                                      onChange={(e) => setVariantFormData({ ...variantFormData, code: e.target.value.toUpperCase() })}
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                  <div className="variant-form-field">
                                    <label>Variant Name *</label>
                                    <Input
                                      placeholder="e.g., Red - 32GB"
                                      value={variantFormData.name}
                                      onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                  <div className="variant-form-field">
                                    <label>Barcode</label>
                                    <Input
                                      placeholder="Optional barcode"
                                      value={variantFormData.barcode}
                                      onChange={(e) => setVariantFormData({ ...variantFormData, barcode: e.target.value })}
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                  <div className="variant-form-field checkbox-field">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={variantFormData.isDefault}
                                        onChange={(e) => setVariantFormData({ ...variantFormData, isDefault: e.target.checked })}
                                      />
                                      Set as Default Variant
                                    </label>
                                  </div>
                                </div>
                                <div className="variant-form-actions">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!variantFormData.code || !variantFormData.name) {
                                        setError('Variant code and name are required');
                                        return;
                                      }
                                      try {
                                        await inventoryService.createVariant({
                                          itemId: item.id,
                                          code: variantFormData.code,
                                          name: variantFormData.name,
                                          barcode: variantFormData.barcode || undefined,
                                          isDefault: variantFormData.isDefault,
                                          images: variantFormData.images || [],
                                        });
                                        setSuccess('Variant created successfully');
                                        clearSuccessMessage();
                                        setAddingVariantForItem(null);
                                        setVariantFormData({ code: '', name: '', barcode: '', isDefault: false, images: [] });
                                        await loadVariants(item.id);
                                        await loadVariantStock(item.id);
                                        // Reload items to refresh hasVariants flag
                                        loadItems();
                                      } catch (err: any) {
                                        const message = extractErrorMessage(err, 'Failed to create variant');
                                        setError(message);
                                        logger.error('[ItemMaster] Failed to create variant', err);
                                      }
                                    }}
                                  >
                                    Create Variant
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddingVariantForItem(null);
                                      setVariantFormData({ code: '', name: '', barcode: '', isDefault: false, images: [] });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Variants List - Table Format */}
                            <div className="expanded-variants-list">
                              {itemVariants.length > 0 ? (
                                <table className="variants-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '60px' }}>Image</th>
                                      <th style={{ width: '150px' }}>Code</th>
                                      <th style={{ width: '200px' }}>Name</th>
                                      <th style={{ width: '120px' }}>Barcode</th>
                                      <th style={{ width: '100px' }}>Stock</th>
                                      <th style={{ width: '120px' }}>Cost Price</th>
                                      <th style={{ width: '120px' }}>Selling Price</th>
                                      <th style={{ width: '100px' }}>Status</th>
                                      <th style={{ width: '80px' }}>Default</th>
                                      <th style={{ width: '100px' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {itemVariants.map((variant) => {
                                      const stockInfo = variantStock.find(vs => vs.variantId === variant.id);
                                      return (
                                        <tr key={variant.id} className="variant-row">
                                          <td>
                                            <div className="variant-table-image">
                                              {variant.images && variant.images.length > 0 ? (
                                                <img
                                                  src={variant.images.find(img => img.isPrimary)?.url || variant.images[0].url}
                                                  alt={variant.name}
                                                  className="variant-thumbnail"
                                                />
                                              ) : (
                                                <div className="variant-thumbnail-placeholder">
                                                  <span>No Image</span>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td>
                                            <span className="variant-code-text">{variant.code}</span>
                                          </td>
                                          <td>
                                            <span className="variant-name-text">{variant.name}</span>
                                          </td>
                                          <td>
                                            <span className="variant-barcode-text">{variant.barcode || '-'}</span>
                                          </td>
                                          <td>
                                            <span className="variant-stock-text">
                                              {stockInfo?.totalOnHand || 0}
                                            </span>
                                          </td>
                                          <td>
                                            {variant.costPriceOverride !== undefined ? (
                                              <span className="variant-price-text">${variant.costPriceOverride.toFixed(2)}</span>
                                            ) : (
                                              <span className="variant-price-text text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {variant.sellingPriceOverride !== undefined ? (
                                              <span className="variant-price-text">${variant.sellingPriceOverride.toFixed(2)}</span>
                                            ) : (
                                              <span className="variant-price-text text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            <span className={`variant-status-badge ${variant.isActive ? 'active' : 'inactive'}`}>
                                              {variant.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                          </td>
                                          <td>
                                            {variant.isDefault && (
                                              <span className="variant-default-badge">Default</span>
                                            )}
                                            {!variant.isDefault && <span className="text-muted">-</span>}
                                          </td>
                                          <td>
                                            <div className="variant-row-actions">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  try {
                                                    await inventoryService.deleteVariant(variant.id);
                                                    setSuccess('Variant deleted successfully');
                                                    clearSuccessMessage();
                                                    await loadVariants(item.id);
                                                    await loadVariantStock(item.id);
                                                  } catch (err: any) {
                                                    const message = extractErrorMessage(err, 'Failed to delete variant');
                                                    setError(message);
                                                    logger.error('[ItemMaster] Failed to delete variant', err);
                                                  }
                                                }}
                                                title="Delete Variant"
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
                              ) : (
                                <div className="no-variants-message">
                                  <p>No variants yet. Click "+ Add New Variant" to create one.</p>
                                </div>
                              )}
                            </div>
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
        </>
      )}
      </div>
    </div>
  );

  // Step navigation handlers
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      const newCompleted = new Set(completedSteps);
      newCompleted.add(currentStep);
      setCompletedSteps(newCompleted);
      if (currentStep < wizardSteps.length) {
        setCurrentStep(currentStep + 1);
        setError(null);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleStepClick = (stepId: number) => {
    // Allow clicking on completed steps or current step
    if (completedSteps.has(stepId) || stepId === currentStep || stepId < currentStep) {
      setCurrentStep(stepId);
      setError(null);
    }
  };

  // Reset wizard when form mode changes
  useEffect(() => {
    if (viewMode === 'add' || viewMode === 'edit') {
      setCurrentStep(1);
      setCompletedSteps(new Set());
    }
  }, [viewMode]);

  // Step Indicator Component
  const renderStepIndicator = () => (
    <div className="wizard-step-indicator">
      {wizardSteps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.has(step.id);
        const isClickable = isCompleted || step.id < currentStep || isActive;
        
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
            <div
              className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && handleStepClick(step.id)}
            >
              <div className="wizard-step-number">
                {isCompleted ? '✓' : step.id}
              </div>
              <div className="wizard-step-label">{step.label}</div>
            </div>
            {index < wizardSteps.length - 1 && (
              <div className={`wizard-step-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderForm = () => (
    <Card className="item-form-wizard">
      <div className="wizard-header">
        <h2>{viewMode === 'add' ? 'Create New Item' : 'Edit Item'}</h2>
        {renderStepIndicator()}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="wizard-content">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="step-content" data-step="basic">
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              
              <div className="form-group">
                <label>SKU *</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                    setHasUnsavedChanges(true);
                    if (fieldErrors.sku) {
                      const newErrors = { ...fieldErrors };
                      delete newErrors.sku;
                      setFieldErrors(newErrors);
                    }
                  }}
                  disabled={viewMode === 'edit'}
                  placeholder="ITEM-001"
                  className={fieldErrors.sku ? 'error-input' : ''}
                />
                {fieldErrors.sku && <div className="field-error">{fieldErrors.sku}</div>}
              </div>

              <div className="form-group">
                <label>Barcode</label>
                <Input
                  value={formData.barcode || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, barcode: e.target.value });
                    setHasUnsavedChanges(true);
                    if (fieldErrors.barcode) {
                      const newErrors = { ...fieldErrors };
                      delete newErrors.barcode;
                      setFieldErrors(newErrors);
                    }
                  }}
                  placeholder="1234567890123"
                />
                {fieldErrors.barcode && <div className="field-error">{fieldErrors.barcode}</div>}
              </div>

              <div className="form-group">
                <label>Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setHasUnsavedChanges(true);
                    if (fieldErrors.name) {
                      const newErrors = { ...fieldErrors };
                      delete newErrors.name;
                      setFieldErrors(newErrors);
                    }
                  }}
                  placeholder="Item Name"
                  className={fieldErrors.name ? 'error-input' : ''}
                />
                {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  rows={4}
                  placeholder="Item description"
                  maxLength={2000}
                />
                <div className="field-helper-text">
                  {formData.description?.length || 0} / 2000 characters
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Category"
                    list="categories-list"
                  />
                  <datalist id="categories-list">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Unit of Measure *</label>
                  <Select
                    value={formData.unitOfMeasure}
                    onChange={(e) => {
                      setFormData({ ...formData, unitOfMeasure: e.target.value });
                      setHasUnsavedChanges(true);
                      if (fieldErrors.unitOfMeasure) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.unitOfMeasure;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.unitOfMeasure ? 'error-input' : ''}
                  >
                    <option value="">Select unit</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="l">l (Liters)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="m">m (Meters)</option>
                    <option value="cm">cm (Centimeters)</option>
                    <option value="box">box (Boxes)</option>
                    <option value="pack">pack (Packs)</option>
                    <option value="carton">carton (Cartons)</option>
                  </Select>
                  {fieldErrors.unitOfMeasure && <div className="field-error">{fieldErrors.unitOfMeasure}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Images & Media */}
        {currentStep === 2 && (
          <div className="step-content" data-step="images">
            <div className="form-section">
              <h3 className="form-section-title">Product Images</h3>
              <p className="form-section-description">Upload product images. The first image will be used as the primary image.</p>
              <ImageUpload
                images={formData.images || []}
                onChange={(images) => {
                  setFormData({ ...formData, images });
                  setHasUnsavedChanges(true);
                }}
                maxImages={10}
                folder="inventory"
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Step 3: Pricing & Supplier */}
        {currentStep === 3 && (
          <div className="step-content" data-step="pricing">
            <div className="form-section">
              <h3 className="form-section-title">Pricing</h3>
              <div className="pricing-grid">
                <div className="form-group">
                  <label>Cost Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.costPrice || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const newData = { ...formData, costPrice: value };
                      if (value && formData.sellingPrice && value > 0) {
                        newData.margin = ((formData.sellingPrice - value) / value) * 100;
                      } else {
                        newData.margin = undefined;
                      }
                      setFormData(newData);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Selling Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const newData = { ...formData, sellingPrice: value };
                      if (value && formData.costPrice && formData.costPrice > 0) {
                        newData.margin = ((value - formData.costPrice) / formData.costPrice) * 100;
                      } else {
                        newData.margin = undefined;
                      }
                      setFormData(newData);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Margin (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.margin !== undefined ? formData.margin.toFixed(2) : ''}
                    disabled
                    placeholder="Auto-calculated"
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  {formData.margin !== undefined && (
                    <div className={`margin-indicator ${formData.margin >= 30 ? 'good' : formData.margin >= 15 ? 'moderate' : 'low'}`}>
                      {formData.margin >= 30 ? '✓ Good Margin' : formData.margin >= 15 ? '⚠ Moderate Margin' : '⚠ Low Margin'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Supplier Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name</label>
                  <Input
                    value={formData.supplierName || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, supplierName: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Supplier name"
                  />
                </div>
                <div className="form-group">
                  <label>Supplier Code</label>
                  <Input
                    value={formData.supplierCode || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, supplierCode: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Supplier code"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Physical Attributes */}
        {currentStep === 4 && (
          <div className="step-content" data-step="dimensions">
            <div className="form-section">
              <h3 className="form-section-title">Dimensions & Weight</h3>
              <div className="dimensions-grid">
                <div className="form-group">
                  <label>Length</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.dimensions?.length || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions,
                          length: value || 0,
                          width: formData.dimensions?.width || 0,
                          height: formData.dimensions?.height || 0,
                          unit: formData.dimensions?.unit || 'cm',
                        } as any,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Width</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.dimensions?.width || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions,
                          length: formData.dimensions?.length || 0,
                          width: value || 0,
                          height: formData.dimensions?.height || 0,
                          unit: formData.dimensions?.unit || 'cm',
                        } as any,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Height</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.dimensions?.height || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions,
                          length: formData.dimensions?.length || 0,
                          width: formData.dimensions?.width || 0,
                          height: value || 0,
                          unit: formData.dimensions?.unit || 'cm',
                        } as any,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <Select
                    value={formData.dimensions?.unit || 'cm'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions,
                          length: formData.dimensions?.length || 0,
                          width: formData.dimensions?.width || 0,
                          height: formData.dimensions?.height || 0,
                          unit: e.target.value,
                        } as any,
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="inches">inches</option>
                    <option value="ft">ft</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.weight?.value || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({
                        ...formData,
                        weight: {
                          value: value || 0,
                          unit: formData.weight?.unit || 'kg',
                        } as any,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Weight Unit</label>
                  <Select
                    value={formData.weight?.unit || 'kg'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        weight: {
                          value: formData.weight?.value || 0,
                          unit: e.target.value,
                        } as any,
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lbs">lbs</option>
                    <option value="oz">oz</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Industry Settings */}
        {currentStep === 5 && (
          <div className="step-content" data-step="industry">
            <div className="form-section">
              <h3 className="form-section-title">Industry Type</h3>
              <div className="form-group">
                <label>Industry Type *</label>
                <Select
                  value={formData.industryFlags.industryType}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      industryFlags: {
                        ...formData.industryFlags,
                        industryType: e.target.value as IndustryType,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                >
                  {Object.values(IndustryType).map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Industry Flags</h3>
              <div className="industry-flags-grid">
                <div className="form-group checkbox-enhanced">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.industryFlags.isPerishable}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          industryFlags: {
                            ...formData.industryFlags,
                            isPerishable: e.target.checked,
                          },
                        });
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <span className="checkbox-text">
                      <strong>Perishable</strong>
                      <span className="checkbox-description">Item has expiration date</span>
                    </span>
                  </label>
                </div>
                <div className="form-group checkbox-enhanced">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.industryFlags.requiresBatchTracking}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          industryFlags: {
                            ...formData.industryFlags,
                            requiresBatchTracking: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="checkbox-text">
                      <strong>Requires Batch Tracking</strong>
                      <span className="checkbox-description">Track items by batch number</span>
                    </span>
                  </label>
                </div>
                <div className="form-group checkbox-enhanced">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.industryFlags.requiresSerialTracking}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          industryFlags: {
                            ...formData.industryFlags,
                            requiresSerialTracking: e.target.checked,
                          },
                        });
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <span className="checkbox-text">
                      <strong>Requires Serial Tracking</strong>
                      <span className="checkbox-description">Track items by serial number</span>
                    </span>
                  </label>
                </div>
                <div className="form-group checkbox-enhanced">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.industryFlags.hasExpiryDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          industryFlags: {
                            ...formData.industryFlags,
                            hasExpiryDate: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="checkbox-text">
                      <strong>Has Expiry Date</strong>
                      <span className="checkbox-description">Item expires and needs monitoring</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Stock Management */}
        {currentStep === 6 && (
          <div className="step-content" data-step="stock">
            <div className="form-section">
              <h3 className="form-section-title">Stock Levels</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Stock Level</label>
                  <Input
                    type="number"
                    value={formData.minStockLevel || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({ ...formData, minStockLevel: value });
                      setHasUnsavedChanges(true);
                      if (fieldErrors.minStockLevel) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.minStockLevel;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.minStockLevel ? 'error-input' : ''}
                  />
                  {fieldErrors.minStockLevel && <div className="field-error">{fieldErrors.minStockLevel}</div>}
                </div>
                <div className="form-group">
                  <label>Max Stock Level</label>
                  <Input
                    type="number"
                    value={formData.maxStockLevel || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({ ...formData, maxStockLevel: value });
                      setHasUnsavedChanges(true);
                      if (fieldErrors.maxStockLevel) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.maxStockLevel;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.maxStockLevel ? 'error-input' : ''}
                  />
                  {fieldErrors.maxStockLevel && <div className="field-error">{fieldErrors.maxStockLevel}</div>}
                </div>
                <div className="form-group">
                  <label>Reorder Point</label>
                  <Input
                    type="number"
                    value={formData.reorderPoint || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setFormData({ ...formData, reorderPoint: value });
                      setHasUnsavedChanges(true);
                      if (fieldErrors.reorderPoint) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.reorderPoint;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.reorderPoint ? 'error-input' : ''}
                  />
                  {fieldErrors.reorderPoint && <div className="field-error">{fieldErrors.reorderPoint}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Variants */}
        {currentStep === 7 && (
          <div className="step-content" data-step="variants">
            <div className="form-section variants-management">
              <div className="form-section-header">
                <div>
                  <h3 className="form-section-title">Variants</h3>
                  <p className="form-section-description">Add product variants with different attributes (color, size, etc.)</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const newVariant: CreateVariantRequest & { tempId: string } = {
                      itemId: '',
                      code: '',
                      name: '',
                      isDefault: formVariants.length === 0,
                      barcode: '',
                      images: [],
                      tempId: `temp-${Date.now()}`,
                    };
                    setFormVariants([...formVariants, newVariant]);
                    setEditingVariantIndex(formVariants.length);
                  }}
                  disabled={loading}
                >
                  + Add Variant
                </Button>
              </div>
              
              {formVariants.length > 0 && (
                <div className="variants-list">
                  {formVariants.map((variant, index) => (
                    <div key={variant.tempId} className="variant-form-card">
                      <div className="variant-form-card-header">
                        <h4>Variant {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newVariants = formVariants.filter((_, i) => i !== index);
                            setFormVariants(newVariants);
                            setEditingVariantIndex(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="variant-form-fields">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Variant Code *</label>
                            <Input
                              value={variant.code}
                              onChange={(e) => {
                                const newVariants = [...formVariants];
                                newVariants[index] = { ...variant, code: e.target.value.toUpperCase() };
                                setFormVariants(newVariants);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="RED-32GB"
                            />
                          </div>
                          <div className="form-group">
                            <label>Variant Name *</label>
                            <Input
                              value={variant.name}
                              onChange={(e) => {
                                const newVariants = [...formVariants];
                                newVariants[index] = { ...variant, name: e.target.value };
                                setFormVariants(newVariants);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Red - 32GB"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Barcode</label>
                            <Input
                              value={variant.barcode || ''}
                              onChange={(e) => {
                                const newVariants = [...formVariants];
                                newVariants[index] = { ...variant, barcode: e.target.value };
                                setFormVariants(newVariants);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Optional barcode"
                            />
                          </div>
                          <div className="form-group">
                            <label>
                              <input
                                type="checkbox"
                                checked={variant.isDefault || false}
                                onChange={(e) => {
                                  const newVariants = formVariants.map((v, i) => ({
                                    ...v,
                                    isDefault: i === index ? e.target.checked : false,
                                  }));
                                  setFormVariants(newVariants);
                                  setHasUnsavedChanges(true);
                                }}
                              />
                              Set as Default Variant
                            </label>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Variant Images</label>
                          <ImageUpload
                            images={variant.images || []}
                            onChange={(images) => {
                              const newVariants = [...formVariants];
                              newVariants[index] = { ...variant, images };
                              setFormVariants(newVariants);
                              setHasUnsavedChanges(true);
                            }}
                            maxImages={5}
                            folder="variants"
                            disabled={loading}
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Cost Price Override</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.costPriceOverride || ''}
                              onChange={(e) => {
                                const newVariants = [...formVariants];
                                newVariants[index] = {
                                  ...variant,
                                  costPriceOverride: e.target.value ? parseFloat(e.target.value) : undefined,
                                };
                                setFormVariants(newVariants);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Override item cost price"
                            />
                          </div>
                          <div className="form-group">
                            <label>Selling Price Override</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.sellingPriceOverride || ''}
                              onChange={(e) => {
                                const newVariants = [...formVariants];
                                newVariants[index] = {
                                  ...variant,
                                  sellingPriceOverride: e.target.value ? parseFloat(e.target.value) : undefined,
                                };
                                setFormVariants(newVariants);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Override item selling price"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {formVariants.length === 0 && (
                <div className="empty-variants-message">
                  <p>No variants added yet. Click "+ Add Variant" to create one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 8: Tags & Metadata */}
        {currentStep === 8 && (
          <div className="step-content" data-step="tags">
            <div className="form-section">
              <h3 className="form-section-title">Tags</h3>
              <p className="form-section-description">Add tags to help categorize and search for this item</p>
              <div className="form-group">
                <Input
                  value={(formData.tags || []).join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0);
                    setFormData({ ...formData, tags });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter tags separated by commas (e.g., electronics, popular, sale)"
                />
                <div className="tags-hint">Separate tags with commas</div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="tags-display">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="tag-chip">
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = formData.tags?.filter((_, i) => i !== index) || [];
                            setFormData({ ...formData, tags: newTags });
                            setHasUnsavedChanges(true);
                          }}
                          className="tag-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <div className="wizard-footer-left">
          <Button
            variant="secondary"
            onClick={() => {
              if (hasUnsavedChanges) {
                setPendingNavigation(() => () => {
                  setViewMode('list');
                  setFieldErrors({});
                  setCurrentStep(1);
                  setCompletedSteps(new Set());
                });
                setShowUnsavedDialog(true);
              } else {
                setViewMode('list');
                setFieldErrors({});
                setCurrentStep(1);
                setCompletedSteps(new Set());
              }
            }}
          >
            Cancel
          </Button>
        </div>
        <div className="wizard-footer-right">
          {currentStep > 1 && (
            <Button variant="ghost" onClick={handlePreviousStep}>
              Previous
            </Button>
          )}
          {currentStep < wizardSteps.length ? (
            <Button variant="primary" onClick={handleNextStep}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={viewMode === 'add' ? handleCreate : handleUpdate}
              disabled={loading}
            >
              {loading ? 'Saving...' : viewMode === 'add' ? 'Create Item' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  const handleToggleActive = async () => {
        <label>SKU *</label>
        <Input
          value={formData.sku}
          onChange={(e) => {
            setFormData({ ...formData, sku: e.target.value.toUpperCase() });
            if (fieldErrors.sku) {
              const newErrors = { ...fieldErrors };
              delete newErrors.sku;
              setFieldErrors(newErrors);
            }
          }}
          disabled={viewMode === 'edit'}
          placeholder="ITEM-001"
          className={fieldErrors.sku ? 'error-input' : ''}
        />
        {fieldErrors.sku && <div className="field-error">{fieldErrors.sku}</div>}
      </div>

      <div className="form-group">
        <label>Barcode</label>
        <Input
            value={formData.barcode || ''}
            onChange={(e) => {
              setFormData({ ...formData, barcode: e.target.value });
              setHasUnsavedChanges(true);
              if (fieldErrors.barcode) {
                const newErrors = { ...fieldErrors };
                delete newErrors.barcode;
                setFieldErrors(newErrors);
              }
            }}
          placeholder="1234567890123"
        />
        {fieldErrors.barcode && <div className="field-error">{fieldErrors.barcode}</div>}
      </div>

      <div className="form-group">
        <label>Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            setHasUnsavedChanges(true);
            if (fieldErrors.name) {
              const newErrors = { ...fieldErrors };
              delete newErrors.name;
              setFieldErrors(newErrors);
            }
          }}
          placeholder="Item Name"
          className={fieldErrors.name ? 'error-input' : ''}
        />
        {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            setHasUnsavedChanges(true);
          }}
          rows={3}
          placeholder="Item description"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Category</label>
          <Input
            value={formData.category}
            onChange={(e) => {
              setFormData({ ...formData, category: e.target.value });
              setHasUnsavedChanges(true);
            }}
            placeholder="Category"
          />
        </div>
        <div className="form-group">
          <label>Unit of Measure *</label>
          <Input
            value={formData.unitOfMeasure}
            onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
            placeholder="pcs, kg, liters"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Industry Type *</label>
        <Select
          value={formData.industryFlags.industryType}
          onChange={(e) => {
            setFormData({
              ...formData,
              industryFlags: {
                ...formData.industryFlags,
                industryType: e.target.value as IndustryType,
              },
            });
            setHasUnsavedChanges(true);
          }}
        >
          {Object.values(IndustryType).map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.industryFlags.isPerishable}
            onChange={(e) => {
              setFormData({
                ...formData,
                industryFlags: {
                  ...formData.industryFlags,
                  isPerishable: e.target.checked,
                },
              });
              setHasUnsavedChanges(true);
            }}
          />
          Perishable
        </label>
        <label>
          <input
            type="checkbox"
            checked={formData.industryFlags.requiresBatchTracking}
            onChange={(e) =>
              setFormData({
                ...formData,
                industryFlags: {
                  ...formData.industryFlags,
                  requiresBatchTracking: e.target.checked,
                },
              })
            }
          />
          Requires Batch Tracking
        </label>
        <label>
          <input
            type="checkbox"
            checked={formData.industryFlags.requiresSerialTracking}
            onChange={(e) => {
              setFormData({
                ...formData,
                industryFlags: {
                  ...formData.industryFlags,
                  requiresSerialTracking: e.target.checked,
                },
              });
              setHasUnsavedChanges(true);
            }}
          />
          Requires Serial Tracking
        </label>
        <label>
          <input
            type="checkbox"
            checked={formData.industryFlags.hasExpiryDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                industryFlags: {
                  ...formData.industryFlags,
                  hasExpiryDate: e.target.checked,
                },
              })
            }
          />
          Has Expiry Date
        </label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Min Stock Level</label>
          <Input
            type="number"
            value={formData.minStockLevel || ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : undefined;
              setFormData({ ...formData, minStockLevel: value });
              setHasUnsavedChanges(true);
              if (fieldErrors.minStockLevel) {
                const newErrors = { ...fieldErrors };
                delete newErrors.minStockLevel;
                setFieldErrors(newErrors);
              }
            }}
            className={fieldErrors.minStockLevel ? 'error-input' : ''}
          />
          {fieldErrors.minStockLevel && <div className="field-error">{fieldErrors.minStockLevel}</div>}
        </div>
        <div className="form-group">
          <label>Max Stock Level</label>
          <Input
            type="number"
            value={formData.maxStockLevel || ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : undefined;
              setFormData({ ...formData, maxStockLevel: value });
              if (fieldErrors.maxStockLevel) {
                const newErrors = { ...fieldErrors };
                delete newErrors.maxStockLevel;
                setFieldErrors(newErrors);
              }
            }}
            className={fieldErrors.maxStockLevel ? 'error-input' : ''}
          />
          {fieldErrors.maxStockLevel && <div className="field-error">{fieldErrors.maxStockLevel}</div>}
        </div>
        <div className="form-group">
          <label>Reorder Point</label>
          <Input
            type="number"
            value={formData.reorderPoint || ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : undefined;
              setFormData({ ...formData, reorderPoint: value });
              setHasUnsavedChanges(true);
              if (fieldErrors.reorderPoint) {
                const newErrors = { ...fieldErrors };
                delete newErrors.reorderPoint;
                setFieldErrors(newErrors);
              }
            }}
            className={fieldErrors.reorderPoint ? 'error-input' : ''}
          />
          {fieldErrors.reorderPoint && <div className="field-error">{fieldErrors.reorderPoint}</div>}
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="form-section">
        <h3 className="form-section-title">Product Images</h3>
        <ImageUpload
          images={formData.images || []}
          onChange={(images) => {
            setFormData({ ...formData, images });
            setHasUnsavedChanges(true);
          }}
          maxImages={10}
          folder="inventory"
          disabled={loading}
        />
      </div>

      {/* Pricing Section */}
      <div className="form-section">
        <h3 className="form-section-title">Pricing</h3>
        <div className="pricing-grid">
          <div className="form-group">
            <label>Cost Price</label>
            <Input
              type="number"
              step="0.01"
              value={formData.costPrice || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                const newData = { ...formData, costPrice: value };
                // Auto-calculate margin if both prices exist
                if (value && formData.sellingPrice && value > 0) {
                  newData.margin = ((formData.sellingPrice - value) / value) * 100;
                } else {
                  newData.margin = undefined;
                }
                setFormData(newData);
                setHasUnsavedChanges(true);
              }}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Selling Price</label>
            <Input
              type="number"
              step="0.01"
              value={formData.sellingPrice || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                const newData = { ...formData, sellingPrice: value };
                // Auto-calculate margin if both prices exist
                if (value && formData.costPrice && formData.costPrice > 0) {
                  newData.margin = ((value - formData.costPrice) / formData.costPrice) * 100;
                } else {
                  newData.margin = undefined;
                }
                setFormData(newData);
                setHasUnsavedChanges(true);
              }}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Margin (%)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.margin !== undefined ? formData.margin.toFixed(2) : ''}
              disabled
              placeholder="Auto-calculated"
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>
        </div>
      </div>

      {/* Supplier Section */}
      <div className="form-section">
        <h3 className="form-section-title">Supplier Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Supplier Name</label>
            <Input
              value={formData.supplierName || ''}
              onChange={(e) => {
                setFormData({ ...formData, supplierName: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder="Supplier name"
            />
          </div>
          <div className="form-group">
            <label>Supplier Code</label>
            <Input
              value={formData.supplierCode || ''}
              onChange={(e) => {
                setFormData({ ...formData, supplierCode: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder="Supplier code"
            />
          </div>
        </div>
      </div>

      {/* Dimensions Section */}
      <div className="form-section">
        <h3 className="form-section-title">Dimensions & Weight</h3>
        <div className="dimensions-grid">
          <div className="form-group">
            <label>Length</label>
            <Input
              type="number"
              step="0.01"
              value={formData.dimensions?.length || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions,
                    length: value || 0,
                    width: formData.dimensions?.width || 0,
                    height: formData.dimensions?.height || 0,
                    unit: formData.dimensions?.unit || 'cm',
                  } as any,
                });
                setHasUnsavedChanges(true);
              }}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Width</label>
            <Input
              type="number"
              step="0.01"
              value={formData.dimensions?.width || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions,
                    length: formData.dimensions?.length || 0,
                    width: value || 0,
                    height: formData.dimensions?.height || 0,
                    unit: formData.dimensions?.unit || 'cm',
                  } as any,
                });
                setHasUnsavedChanges(true);
              }}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Height</label>
            <Input
              type="number"
              step="0.01"
              value={formData.dimensions?.height || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions,
                    length: formData.dimensions?.length || 0,
                    width: formData.dimensions?.width || 0,
                    height: value || 0,
                    unit: formData.dimensions?.unit || 'cm',
                  } as any,
                });
                setHasUnsavedChanges(true);
              }}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <Select
              value={formData.dimensions?.unit || 'cm'}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions,
                    length: formData.dimensions?.length || 0,
                    width: formData.dimensions?.width || 0,
                    height: formData.dimensions?.height || 0,
                    unit: e.target.value,
                  } as any,
                });
                setHasUnsavedChanges(true);
              }}
            >
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="inches">inches</option>
              <option value="ft">ft</option>
            </Select>
          </div>
          <div className="form-group">
            <label>Weight</label>
            <Input
              type="number"
              step="0.01"
              value={formData.weight?.value || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData({
                  ...formData,
                  weight: {
                    value: value || 0,
                    unit: formData.weight?.unit || 'kg',
                  } as any,
                });
                setHasUnsavedChanges(true);
              }}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Weight Unit</label>
            <Select
              value={formData.weight?.unit || 'kg'}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  weight: {
                    value: formData.weight?.value || 0,
                    unit: e.target.value,
                  } as any,
                });
                setHasUnsavedChanges(true);
              }}
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="lbs">lbs</option>
              <option value="oz">oz</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="form-section">
        <h3 className="form-section-title">Tags</h3>
        <div className="form-group">
          <Input
            value={(formData.tags || []).join(', ')}
            onChange={(e) => {
              const tags = e.target.value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
              setFormData({ ...formData, tags });
              setHasUnsavedChanges(true);
            }}
            placeholder="Enter tags separated by commas (e.g., electronics, popular, sale)"
          />
          <div className="tags-hint">Separate tags with commas</div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="tags-display">
              {formData.tags.map((tag, index) => (
                <span key={index} className="tag-chip">
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const newTags = formData.tags?.filter((_, i) => i !== index) || [];
                      setFormData({ ...formData, tags: newTags });
                      setHasUnsavedChanges(true);
                    }}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Variants Management Section */}
      <div className="form-section variants-management">
        <div className="form-section-header">
          <h3 className="form-section-title">Variants</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const newVariant: CreateVariantRequest & { tempId: string } = {
                itemId: '',
                code: '',
                name: '',
                isDefault: formVariants.length === 0,
                barcode: '',
                images: [],
                tempId: `temp-${Date.now()}`,
              };
              setFormVariants([...formVariants, newVariant]);
              setEditingVariantIndex(formVariants.length);
            }}
            disabled={loading}
          >
            + Add Variant
          </Button>
        </div>
        
        {formVariants.length > 0 && (
          <div className="variants-list">
            {formVariants.map((variant, index) => (
              <div key={variant.tempId} className="variant-form-card">
                <div className="variant-form-card-header">
                  <h4>Variant {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newVariants = formVariants.filter((_, i) => i !== index);
                      setFormVariants(newVariants);
                      setEditingVariantIndex(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <div className="variant-form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Variant Code *</label>
                      <Input
                        value={variant.code}
                        onChange={(e) => {
                          const newVariants = [...formVariants];
                          newVariants[index] = { ...variant, code: e.target.value.toUpperCase() };
                          setFormVariants(newVariants);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="RED-32GB"
                      />
                    </div>
                    <div className="form-group">
                      <label>Variant Name *</label>
                      <Input
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...formVariants];
                          newVariants[index] = { ...variant, name: e.target.value };
                          setFormVariants(newVariants);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Red - 32GB"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Barcode</label>
                      <Input
                        value={variant.barcode || ''}
                        onChange={(e) => {
                          const newVariants = [...formVariants];
                          newVariants[index] = { ...variant, barcode: e.target.value };
                          setFormVariants(newVariants);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Optional barcode"
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={variant.isDefault || false}
                          onChange={(e) => {
                            const newVariants = formVariants.map((v, i) => ({
                              ...v,
                              isDefault: i === index ? e.target.checked : false,
                            }));
                            setFormVariants(newVariants);
                            setHasUnsavedChanges(true);
                          }}
                        />
                        Set as Default Variant
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Variant Images</label>
                    <ImageUpload
                      images={variant.images || []}
                      onChange={(images) => {
                        const newVariants = [...formVariants];
                        newVariants[index] = { ...variant, images };
                        setFormVariants(newVariants);
                        setHasUnsavedChanges(true);
                      }}
                      maxImages={5}
                      folder="variants"
                      disabled={loading}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cost Price Override</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.costPriceOverride || ''}
                        onChange={(e) => {
                          const newVariants = [...formVariants];
                          newVariants[index] = {
                            ...variant,
                            costPriceOverride: e.target.value ? parseFloat(e.target.value) : undefined,
                          };
                          setFormVariants(newVariants);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Override item cost price"
                      />
                    </div>
                    <div className="form-group">
                      <label>Selling Price Override</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.sellingPriceOverride || ''}
                        onChange={(e) => {
                          const newVariants = [...formVariants];
                          newVariants[index] = {
                            ...variant,
                            sellingPriceOverride: e.target.value ? parseFloat(e.target.value) : undefined,
                          };
                          setFormVariants(newVariants);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Override item selling price"
                      />
                    </div>

  const handleToggleActive = async () => {
    if (!selectedItemId || !selectedItem) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.updateItem(selectedItemId, { isActive: !selectedItem.isActive });
      setSuccess(`Item ${selectedItem.isActive ? 'deactivated' : 'activated'} successfully`);
      clearSuccessMessage();
      await loadItemDetails();
      loadItems();
    } catch (err: any) {
      const message = extractErrorMessage(err, `Failed to ${selectedItem.isActive ? 'deactivate' : 'activate'} item`);
      setError(message);
      logger.error('[ItemMaster] Failed to toggle item active status', err);
    }
  };

  const renderDetailHeader = () => {
    if (!selectedItem) return null;

    return (
      <div className="item-detail-header">
        <div className="item-detail-header-info">
          <h2 className="item-detail-header-title">{selectedItem.name}</h2>
          <div className="item-detail-header-sku">SKU: {selectedItem.sku}</div>
        </div>
        <div className="item-detail-header-actions">
          <span className={`status-badge ${selectedItem.isActive ? 'status-active' : 'status-inactive'}`}>
            {selectedItem.isActive ? 'Active' : 'Inactive'}
          </span>
          <Button 
            variant={selectedItem.isActive ? 'secondary' : 'primary'} 
            onClick={handleToggleActive} 
            size="sm"
            title={selectedItem.isActive ? 'Deactivate Item' : 'Activate Item'}
          >
            {selectedItem.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="primary" onClick={handleEdit} size="sm">
            Edit
          </Button>
          <Button variant="ghost" onClick={() => {
            setSelectedItemId(null);
            setViewMode('list');
          }} title="Deselect Item" size="sm">
            ✕
          </Button>
        </div>
      </div>
    );
  };

  const renderOverviewView = () => {
    if (!selectedItem) return null;

    const isBasicInfoCollapsed = collapsedSections.has('basic-info');
    const isIndustryFlagsCollapsed = collapsedSections.has('industry-flags');
    const isDescriptionCollapsed = collapsedSections.has('description');
    const isStockLevelsCollapsed = collapsedSections.has('stock-levels');

    return (
      <div className="overview-content">
        {/* Basic Info Section */}
        <div className="collapsible-section">
          <div
            className="collapsible-section-header"
            onClick={() => toggleSectionCollapse('basic-info')}
          >
            <h3>Basic Information</h3>
            <span className="collapsible-section-icon">
              {isBasicInfoCollapsed ? '▶' : '▼'}
            </span>
          </div>
          {!isBasicInfoCollapsed && (
            <div className="collapsible-section-content">
              <div>
                <label>SKU</label>
                <div>{selectedItem.sku}</div>
              </div>
              {(selectedItem as any).barcode && (
                <div>
                  <label>Barcode</label>
                  <div>{(selectedItem as any).barcode}</div>
                </div>
              )}
              <div className="inline-edit-field">
                <label>Name</label>
                {editingField === 'name' ? (
                  <div className="inline-edit-input-wrapper">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleInlineEdit('name', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineEdit('name', editingValue);
                        } else if (e.key === 'Escape') {
                          cancelInlineEdit();
                        }
                      }}
                      autoFocus
                      disabled={savingField === 'name'}
                    />
                    {savingField === 'name' && <span className="saving-indicator">Saving...</span>}
                  </div>
                ) : (
                  <div className="inline-edit-display" onClick={() => startInlineEdit('name', selectedItem.name)}>
                    <span>{selectedItem.name}</span>
                    <span className="edit-icon" title="Click to edit">✏️</span>
                  </div>
                )}
              </div>
              <div className="inline-edit-field">
                <label>Category</label>
                {editingField === 'category' ? (
                  <div className="inline-edit-input-wrapper">
                    <Input
                      value={editingValue || ''}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleInlineEdit('category', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineEdit('category', editingValue);
                        } else if (e.key === 'Escape') {
                          cancelInlineEdit();
                        }
                      }}
                      autoFocus
                      disabled={savingField === 'category'}
                    />
                    {savingField === 'category' && <span className="saving-indicator">Saving...</span>}
                  </div>
                ) : (
                  <div className="inline-edit-display" onClick={() => startInlineEdit('category', selectedItem.category || '')}>
                    <span>{selectedItem.category || '-'}</span>
                    <span className="edit-icon" title="Click to edit">✏️</span>
                  </div>
                )}
              </div>
              <div className="inline-edit-field">
                <label>Unit of Measure</label>
                {editingField === 'unitOfMeasure' ? (
                  <div className="inline-edit-input-wrapper">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleInlineEdit('unitOfMeasure', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineEdit('unitOfMeasure', editingValue);
                        } else if (e.key === 'Escape') {
                          cancelInlineEdit();
                        }
                      }}
                      autoFocus
                      disabled={savingField === 'unitOfMeasure'}
                    />
                    {savingField === 'unitOfMeasure' && <span className="saving-indicator">Saving...</span>}
                  </div>
                ) : (
                  <div className="inline-edit-display" onClick={() => startInlineEdit('unitOfMeasure', selectedItem.unitOfMeasure)}>
                    <span>{selectedItem.unitOfMeasure}</span>
                    <span className="edit-icon" title="Click to edit">✏️</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Industry Flags Section */}
        <div className="collapsible-section">
          <div
            className="collapsible-section-header"
            onClick={() => toggleSectionCollapse('industry-flags')}
          >
            <h3>Industry Flags</h3>
            <span className="collapsible-section-icon">
              {isIndustryFlagsCollapsed ? '▶' : '▼'}
            </span>
          </div>
          {!isIndustryFlagsCollapsed && (
            <div className="collapsible-section-content">
              <div>
                <label>Industry Type</label>
                <div>{selectedItem.industryFlags.industryType}</div>
              </div>
              <div>
                <label>Perishable</label>
                <div>{selectedItem.industryFlags.isPerishable ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <label>Batch Tracking</label>
                <div>{selectedItem.industryFlags.requiresBatchTracking ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <label>Serial Tracking</label>
                <div>{selectedItem.industryFlags.requiresSerialTracking ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <label>Has Expiry Date</label>
                <div>{selectedItem.industryFlags.hasExpiryDate ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Description Section */}
        {selectedItem.description && (
          <div className="collapsible-section">
            <div
              className="collapsible-section-header"
              onClick={() => toggleSectionCollapse('description')}
            >
              <h3>Description</h3>
              <span className="collapsible-section-icon">
                {isDescriptionCollapsed ? '▶' : '▼'}
              </span>
            </div>
            {!isDescriptionCollapsed && (
              <div className="collapsible-section-content" style={{ gridTemplateColumns: '1fr' }}>
                {editingField === 'description' ? (
                  <div className="inline-edit-input-wrapper">
                    <textarea
                      value={editingValue || ''}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleInlineEdit('description', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelInlineEdit();
                        }
                      }}
                      rows={3}
                      autoFocus
                      disabled={savingField === 'description'}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '4px' }}
                    />
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleInlineEdit('description', editingValue)}
                        disabled={savingField === 'description'}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={cancelInlineEdit}
                        disabled={savingField === 'description'}
                      >
                        Cancel
                      </Button>
                      {savingField === 'description' && <span className="saving-indicator">Saving...</span>}
                    </div>
                  </div>
                ) : (
                  <div className="inline-edit-display" onClick={() => startInlineEdit('description', selectedItem.description || '')}>
                    <p>{selectedItem.description || 'No description'}</p>
                    <span className="edit-icon" title="Click to edit">✏️</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stock Levels Section */}
        {(selectedItem.minStockLevel ||
          selectedItem.maxStockLevel ||
          selectedItem.reorderPoint) && (
          <div className="collapsible-section">
            <div
              className="collapsible-section-header"
              onClick={() => toggleSectionCollapse('stock-levels')}
            >
              <h3>Stock Levels</h3>
              <span className="collapsible-section-icon">
                {isStockLevelsCollapsed ? '▶' : '▼'}
              </span>
            </div>
            {!isStockLevelsCollapsed && (
              <div className="collapsible-section-content">
                <div className="inline-edit-field">
                  <label>Min Stock Level</label>
                  {editingField === 'minStockLevel' ? (
                    <div className="inline-edit-input-wrapper">
                      <Input
                        type="number"
                        value={editingValue || ''}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleInlineEdit('minStockLevel', editingValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleInlineEdit('minStockLevel', editingValue);
                          } else if (e.key === 'Escape') {
                            cancelInlineEdit();
                          }
                        }}
                        autoFocus
                        disabled={savingField === 'minStockLevel'}
                      />
                      {savingField === 'minStockLevel' && <span className="saving-indicator">Saving...</span>}
                    </div>
                  ) : (
                    <div className="inline-edit-display" onClick={() => startInlineEdit('minStockLevel', selectedItem.minStockLevel || '')}>
                      <span>{selectedItem.minStockLevel || '-'}</span>
                      <span className="edit-icon" title="Click to edit">✏️</span>
                    </div>
                  )}
                </div>
                <div className="inline-edit-field">
                  <label>Max Stock Level</label>
                  {editingField === 'maxStockLevel' ? (
                    <div className="inline-edit-input-wrapper">
                      <Input
                        type="number"
                        value={editingValue || ''}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleInlineEdit('maxStockLevel', editingValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleInlineEdit('maxStockLevel', editingValue);
                          } else if (e.key === 'Escape') {
                            cancelInlineEdit();
                          }
                        }}
                        autoFocus
                        disabled={savingField === 'maxStockLevel'}
                      />
                      {savingField === 'maxStockLevel' && <span className="saving-indicator">Saving...</span>}
                    </div>
                  ) : (
                    <div className="inline-edit-display" onClick={() => startInlineEdit('maxStockLevel', selectedItem.maxStockLevel || '')}>
                      <span>{selectedItem.maxStockLevel || '-'}</span>
                      <span className="edit-icon" title="Click to edit">✏️</span>
                    </div>
                  )}
                </div>
                <div className="inline-edit-field">
                  <label>Reorder Point</label>
                  {editingField === 'reorderPoint' ? (
                    <div className="inline-edit-input-wrapper">
                      <Input
                        type="number"
                        value={editingValue || ''}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleInlineEdit('reorderPoint', editingValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleInlineEdit('reorderPoint', editingValue);
                          } else if (e.key === 'Escape') {
                            cancelInlineEdit();
                          }
                        }}
                        autoFocus
                        disabled={savingField === 'reorderPoint'}
                      />
                      {savingField === 'reorderPoint' && <span className="saving-indicator">Saving...</span>}
                    </div>
                  ) : (
                    <div className="inline-edit-display" onClick={() => startInlineEdit('reorderPoint', selectedItem.reorderPoint || '')}>
                      <span>{selectedItem.reorderPoint || '-'}</span>
                      <span className="edit-icon" title="Click to edit">✏️</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStockView = () => {
    if (!selectedItem) return null;

    // Aggregate stock similar to Stock Summary Report logic
    // Group by variantId (null for items without variants)
    const stockByVariant = stockData.reduce((acc, stock) => {
      const variantKey = stock.variantId?.toString() || 'none';
      if (!acc[variantKey]) {
        acc[variantKey] = {
          variantId: stock.variantId?.toString(),
          onHand: 0,
          reserved: 0,
          blocked: 0,
          damaged: 0,
          available: 0,
          locations: {} as Record<string, { location: { id: string; code: string; name: string; type: string }; onHand: number; reserved: number; blocked: number; damaged: number; available: number }>,
        };
      }
      acc[variantKey].onHand += stock.onHandQuantity;
      acc[variantKey].reserved += stock.reservedQuantity;
      acc[variantKey].blocked += stock.blockedQuantity;
      acc[variantKey].damaged += stock.damagedQuantity;
      acc[variantKey].available += stock.availableQuantity;

      // Group by location within variant
      const locId = stock.locationId;
      if (!acc[variantKey].locations[locId]) {
        acc[variantKey].locations[locId] = {
          location: stock.location,
          onHand: 0,
          reserved: 0,
          blocked: 0,
          damaged: 0,
          available: 0,
        };
      }
      acc[variantKey].locations[locId].onHand += stock.onHandQuantity;
      acc[variantKey].locations[locId].reserved += stock.reservedQuantity;
      acc[variantKey].locations[locId].blocked += stock.blockedQuantity;
      acc[variantKey].locations[locId].damaged += stock.damagedQuantity;
      acc[variantKey].locations[locId].available += stock.availableQuantity;

      return acc;
    }, {} as Record<string, {
      variantId?: string;
      onHand: number;
      reserved: number;
      blocked: number;
      damaged: number;
      available: number;
      locations: Record<string, { location: { id: string; code: string; name: string; type: string }; onHand: number; reserved: number; blocked: number; damaged: number; available: number }>;
    }>);

    // Calculate totals across all variants (matching report logic)
    const totalOnHand = Object.values(stockByVariant).reduce((sum, v) => sum + v.onHand, 0);
    const totalReserved = Object.values(stockByVariant).reduce((sum, v) => sum + v.reserved, 0);
    const totalBlocked = Object.values(stockByVariant).reduce((sum, v) => sum + v.blocked, 0);
    const totalDamaged = Object.values(stockByVariant).reduce((sum, v) => sum + v.damaged, 0);
    const totalAvailable = Object.values(stockByVariant).reduce((sum, v) => sum + v.available, 0);
    const locationCount = new Set(stockData.map(s => s.locationId)).size;

    // For location breakdown, aggregate across all variants
    const stockByLocation = stockData.reduce((acc, stock) => {
      const locId = stock.locationId;
      if (!acc[locId]) {
        acc[locId] = {
          location: stock.location,
          onHand: 0,
          reserved: 0,
          blocked: 0,
          damaged: 0,
          available: 0,
        };
      }
      acc[locId].onHand += stock.onHandQuantity;
      acc[locId].reserved += stock.reservedQuantity;
      acc[locId].blocked += stock.blockedQuantity;
      acc[locId].damaged += stock.damagedQuantity;
      acc[locId].available += stock.availableQuantity;
      return acc;
    }, {} as Record<string, { location: { id: string; code: string; name: string; type: string }; onHand: number; reserved: number; blocked: number; damaged: number; available: number }>);

    return (
      <div className="stock-view">
        {/* Summary Cards */}
        <div className="stock-summary-cards">
          <div className="stock-summary-card">
            <div className="stock-summary-label">On Hand</div>
            <div className="stock-summary-value">{totalOnHand}</div>
          </div>
          <div className="stock-summary-card">
            <div className="stock-summary-label">Reserved</div>
            <div className="stock-summary-value">{totalReserved}</div>
          </div>
          <div className="stock-summary-card">
            <div className="stock-summary-label">Available</div>
            <div className="stock-summary-value">{totalAvailable}</div>
          </div>
          <div className="stock-summary-card">
            <div className="stock-summary-label">Locations</div>
            <div className="stock-summary-value">{locationCount}</div>
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="stock-location-breakdown">
          <h4>Location Breakdown</h4>
          {Object.keys(stockByLocation).length === 0 ? (
            <EmptyState message="No stock data available" />
          ) : (
            <table className="stock-location-table">
              <thead>
                <tr>
                  <th>Location Code</th>
                  <th>Location Name</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Blocked</th>
                  <th>Damaged</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(stockByLocation).map((locStock) => (
                  <tr key={locStock.location.id}>
                    <td>{locStock.location.code}</td>
                    <td>{locStock.location.name}</td>
                    <td>{locStock.onHand}</td>
                    <td>{locStock.reserved}</td>
                    <td>{locStock.blocked}</td>
                    <td>{locStock.damaged}</td>
                    <td>{locStock.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Variant Stock (if item has variants) */}
        {selectedItem.hasVariants && variantStock.length > 0 && (
          <div className="variant-stock-section">
            <h4>Variant Stock Summary</h4>
            <div className="variant-stock-grid">
              {variantStock.map((stock) => {
                const variant = variants.find((v) => v.id === stock.variantId);
                return (
                  <div key={stock.variantId} className="variant-stock-card">
                    <div className="variant-stock-header">
                      <strong>{variant ? `${variant.code} - ${variant.name}` : stock.variantId}</strong>
                      {variant?.isDefault && <span className="badge badge-primary">Default</span>}
                    </div>
                    <div className="variant-stock-total">
                      Total: <strong>{stock.totalOnHand}</strong>
                    </div>
                    {stock.locations.length > 0 && (
                      <div className="variant-stock-locations">
                        <div className="locations-header">By Location:</div>
                        {stock.locations.map((loc) => (
                          <div key={loc.locationId} className="location-stock-item">
                            <span>{loc.locationCode} - {loc.locationName}</span>
                            <span className="location-quantity">{loc.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTrackingView = () => {
    if (!selectedItem) return null;

    const hasBatches = selectedItem.industryFlags.requiresBatchTracking;
    const hasSerials = selectedItem.industryFlags.requiresSerialTracking;
    const hasExpiry = selectedItem.industryFlags.hasExpiryDate;

    // Set default sub-view based on what's available
    if (!hasBatches && !hasSerials && !hasExpiry) {
      return <EmptyState message="No tracking features enabled for this item" />;
    }

    return (
      <div className="tracking-view">
        {/* Segmented buttons for tracking sub-views */}
        <div className="tracking-segments">
          {hasBatches && (
            <button
              className={`tracking-segment ${trackingSubView === 'batches' ? 'active' : ''}`}
              onClick={() => setTrackingSubView('batches')}
            >
              Batches
            </button>
          )}
          {hasSerials && (
            <button
              className={`tracking-segment ${trackingSubView === 'serials' ? 'active' : ''}`}
              onClick={() => setTrackingSubView('serials')}
            >
              Serials
            </button>
          )}
          {hasExpiry && (
            <button
              className={`tracking-segment ${trackingSubView === 'expiry' ? 'active' : ''}`}
              onClick={() => setTrackingSubView('expiry')}
            >
              Expiry
            </button>
          )}
        </div>

        {/* Render sub-view content */}
        {trackingSubView === 'batches' && hasBatches && (
          <div className="batches-content">
            {batchViewMode === 'create' ? (
              <Card className="batch-create-form">
                <h3>Create Batch</h3>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                <div className="form-group">
                  <label>Batch Number *</label>
                  <Input
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value.toUpperCase() })}
                    placeholder="BATCH-001"
                  />
                </div>
                <div className="form-group">
                  <label>Manufacturing Date *</label>
                  <Input
                    type="date"
                    value={batchForm.manufacturingDate}
                    onChange={(e) => setBatchForm({ ...batchForm, manufacturingDate: e.target.value })}
                  />
                </div>
                {selectedItem.industryFlags.hasExpiryDate && (
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <Input
                      type="date"
                      value={batchForm.expiryDate}
                      onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-actions">
                  <Button variant="secondary" onClick={() => setBatchViewMode('list')}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleCreateBatch}>
                    Create Batch
                  </Button>
                </div>
              </Card>
            ) : batchViewMode === 'fefo' ? (
              <Card className="batch-fefo">
                <h3>FEFO Allocation Calculator</h3>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                <div className="form-group">
                  <label>Location *</label>
                  <Select
                    value={fefoForm.locationId}
                    onChange={(e) => setFefoForm({ ...fefoForm, locationId: e.target.value })}
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
                  <label>Quantity Required *</label>
                  <Input
                    type="number"
                    value={fefoForm.quantity || ''}
                    onChange={(e) =>
                      setFefoForm({ ...fefoForm, quantity: parseFloat(e.target.value) || 0 })
                    }
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div className="form-actions">
                  <Button variant="secondary" onClick={() => setBatchViewMode('list')}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleFEFO}>
                    Calculate FEFO
                  </Button>
                </div>
                {fefoResult.length > 0 && (
                  <div className="fefo-results" style={{ marginTop: '20px' }}>
                    <h4>FEFO Allocation Results</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Batch Number</th>
                          <th>Quantity</th>
                          <th>Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fefoResult.map((allocation: any, index: number) => (
                          <tr key={index}>
                            <td>{allocation.batchNumber}</td>
                            <td>{allocation.quantity}</td>
                            <td>
                              {allocation.expiryDate
                                ? new Date(allocation.expiryDate).toLocaleDateString()
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ) : (
              <>
                <div className="batches-toolbar" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={() => setBatchViewMode('create')}>
                    Create Batch
                  </Button>
                  <Button variant="secondary" onClick={() => setBatchViewMode('fefo')}>
                    FEFO Calculator
                  </Button>
                </div>
                {batchLoading ? (
                  <LoadingState message="Loading batches..." />
                ) : batches.length === 0 ? (
                  <EmptyState message="No batches found for this item" />
                ) : (
                  <div className="batches-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Batch Number</th>
                          <th>Manufacturing Date</th>
                          <th>Expiry Date</th>
                          <th>Total Quantity</th>
                          <th>Expiry Status</th>
                          <th>Is Expired</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => (
                          <tr key={batch.id}>
                            <td>{batch.batchNumber}</td>
                            <td>{new Date(batch.manufacturingDate).toLocaleDateString()}</td>
                            <td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}</td>
                            <td>{batch.totalQuantity}</td>
                            <td>
                              <span className={`expiry-status-${batch.expiryStatus?.toLowerCase() || 'unknown'}`}>
                                {batch.expiryStatus || '-'}
                              </span>
                            </td>
                            <td>{batch.isExpired ? 'Yes' : 'No'}</td>
                            <td>
                              {batch.isExpired && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    setBatchToDispose({
                                      batchNumber: batch.batchNumber,
                                      itemId: batch.itemId || selectedItemId || '',
                                    });
                                    setShowBatchDisposeDialog(true);
                                  }}
                                >
                                  Dispose
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {trackingSubView === 'serials' && hasSerials && (
          <div className="serials-content">
            <div className="serial-search-section">
              <div className="search-input-group">
                <Input
                  placeholder="Search serial number..."
                  value={serialSearchInput}
                  onChange={(e) => setSerialSearchInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSerialSearch();
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <Button variant="primary" onClick={handleSerialSearch} disabled={serialLoading}>
                  Search
                </Button>
              </div>
            </div>
            
            {selectedSerial ? (
              <div className="serial-details-section">
                <h4>Serial Details</h4>
                <div className="details-grid">
                  <div>
                    <label>Serial Number</label>
                    <div>{selectedSerial.serialNumber}</div>
                  </div>
                  <div>
                    <label>Current Location</label>
                    <div>
                      {selectedSerial.currentLocation
                        ? `${selectedSerial.currentLocation.code} - ${selectedSerial.currentLocation.name}`
                        : selectedSerial.currentLocationId}
                    </div>
                  </div>
                  <div>
                    <label>Status</label>
                    <div>
                      <span className={`status-badge status-${selectedSerial.currentStatus?.toLowerCase()}`}>
                        {selectedSerial.currentStatus}
                      </span>
                    </div>
                  </div>
                </div>
                
                {serialHistory.length > 0 && (
                  <div className="serial-history-section">
                    <h4>Movement History</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Movement Type</th>
                          <th>From Location</th>
                          <th>To Location</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serialHistory.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{new Date(entry.date).toLocaleDateString()}</td>
                            <td>{entry.movementType}</td>
                            <td>{entry.fromLocation ? `${entry.fromLocation.code} - ${entry.fromLocation.name}` : '-'}</td>
                            <td>{entry.toLocation ? `${entry.toLocation.code} - ${entry.toLocation.name}` : '-'}</td>
                            <td>{entry.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="serials-list-section">
                {serialLoading ? (
                  <LoadingState message="Loading serials..." />
                ) : serials.length === 0 ? (
                  <EmptyState message="No serials found for this item. Use search to find a specific serial." />
                ) : (
                  <div className="serials-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Serial Number</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serials.map((serial) => (
                          <tr key={serial.id} onClick={() => {
                            setSelectedSerial(serial);
                            inventoryService.getSerialHistory(serial.serialNumber).then(setSerialHistory).catch(() => {});
                          }}>
                            <td>{serial.serialNumber}</td>
                            <td>{serial.currentLocation ? `${serial.currentLocation.code} - ${serial.currentLocation.name}` : '-'}</td>
                            <td>
                              <span className={`status-badge status-${serial.currentStatus?.toLowerCase()}`}>
                                {serial.currentStatus}
                              </span>
                            </td>
                            <td>{serial.batchNumber || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {trackingSubView === 'expiry' && hasExpiry && (
          <div className="expiry-content">
            <div className="expiry-filters">
              <label>
                Days Ahead:
                <Input
                  type="number"
                  value={expiryDaysAhead}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 30;
                    setExpiryDaysAhead(days);
                    loadExpiryAlerts(selectedItemId || '');
                  }}
                  style={{ width: '100px', marginLeft: '10px' }}
                  min="1"
                />
              </label>
            </div>
            
            {expiryLoading ? (
              <LoadingState message="Loading expiry alerts..." />
            ) : expiryAlerts.length === 0 ? (
              <EmptyState message="No items expiring in the selected period" />
            ) : (
              <div className="expiry-alerts-table">
                <table>
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Batch</th>
                      <th>Quantity</th>
                      <th>Expiry Date</th>
                      <th>Days Until Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiryAlerts.map((alert, index) => (
                      <tr key={index}>
                        <td>{alert.location.code}</td>
                        <td>{alert.batchNumber || '-'}</td>
                        <td>{alert.quantity}</td>
                        <td>{new Date(alert.expiryDate).toLocaleDateString()}</td>
                        <td>
                          <span
                            className={
                              alert.daysUntilExpiry <= 0
                                ? 'days-expired'
                                : alert.daysUntilExpiry <= 7
                                ? 'days-critical'
                                : alert.daysUntilExpiry <= 30
                                ? 'days-warning'
                                : 'days-ok'
                            }
                          >
                            {alert.daysUntilExpiry <= 0
                              ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                              : `${alert.daysUntilExpiry} days`}
                          </span>
                        </td>
                        <td>
                          <span className={`expiry-status-${alert.expiryStatus?.toLowerCase() || 'unknown'}`}>
                            {alert.expiryStatus || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLocationsView = () => {
    if (!selectedItem) return null;

    // Group stock by location
    const stockByLocation = stockData.reduce((acc, stock) => {
      const locId = stock.locationId;
      if (!acc[locId]) {
        acc[locId] = {
          location: stock.location,
          onHand: 0,
          reserved: 0,
          available: 0,
        };
      }
      acc[locId].onHand += stock.onHandQuantity;
      acc[locId].reserved += stock.reservedQuantity;
      acc[locId].available += stock.availableQuantity;
      return acc;
    }, {} as Record<string, { location: { id: string; code: string; name: string; type: string }; onHand: number; reserved: number; available: number }>);

    return (
      <div className="locations-view">
        <h4>Item Locations</h4>
        {Object.keys(stockByLocation).length === 0 ? (
          <EmptyState message="No locations found for this item" />
        ) : (
          <table className="locations-table">
            <thead>
              <tr>
                <th>Location Code</th>
                <th>Location Name</th>
                <th>Type</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(stockByLocation).map((locStock) => (
                <tr key={locStock.location.id}>
                  <td>{locStock.location.code}</td>
                  <td>{locStock.location.name}</td>
                  <td>{locStock.location.type}</td>
                  <td>{locStock.onHand}</td>
                  <td>{locStock.reserved}</td>
                  <td>{locStock.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderHistoryView = () => {
    if (!selectedItem) return null;

    return (
      <div className="history-view">
        <div className="history-filters">
          <div className="filter-group">
            <label>Date From</label>
            <Input
              type="date"
              value={historyFilters.dateFrom}
              onChange={(e) => setHistoryFilters({ ...historyFilters, dateFrom: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Date To</label>
            <Input
              type="date"
              value={historyFilters.dateTo}
              onChange={(e) => setHistoryFilters({ ...historyFilters, dateTo: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Movement Type</label>
            <Select
              value={historyFilters.movementType}
              onChange={(e) => setHistoryFilters({ ...historyFilters, movementType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="RECEIPT">Receipt</option>
              <option value="ISSUE">Issue</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </Select>
          </div>
          <Button variant="ghost" onClick={() => {
            setHistoryFilters({ dateFrom: '', dateTo: '', movementType: '', locationId: '' });
          }}>
            Clear Filters
          </Button>
        </div>

        {historyData.length === 0 ? (
          <EmptyState message="No movement history found for this item" />
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Movement Type</th>
                <th>From Location</th>
                <th>To Location</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((movement) => (
                <tr key={movement.id}>
                  <td>{new Date(movement.createdAt).toLocaleDateString()}</td>
                  <td>{movement.movementType}</td>
                  <td>{movement.fromLocation?.code || '-'}</td>
                  <td>{movement.toLocation?.code || '-'}</td>
                  <td>{movement.quantity}</td>
                  <td>
                    <span className={`status-${movement.status.toLowerCase()}`}>
                      {movement.status}
                    </span>
                  </td>
                  <td>{movement.createdBy?.name || movement.createdBy?.email || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedItem) {
      return <LoadingState message="Loading item details..." />;
    }

    return (
      <div className="item-master-details">
        <div className="item-detail-header-container">
          {renderDetailHeader()}
        </div>
        
        <div className="item-master-details-content">
          {/* Sub-tabs for item details */}
          <div className="item-sub-tabs">
          <button
            className={`item-sub-tab ${itemSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setItemSubTab('overview')}
          >
            Overview
          </button>
          <button
            className={`item-sub-tab ${itemSubTab === 'stock' ? 'active' : ''}`}
            onClick={() => setItemSubTab('stock')}
          >
            Stock
          </button>
          {(selectedItem.industryFlags.requiresBatchTracking ||
            selectedItem.industryFlags.requiresSerialTracking ||
            selectedItem.industryFlags.hasExpiryDate) && (
            <button
              className={`item-sub-tab ${itemSubTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setItemSubTab('tracking')}
            >
              Tracking
            </button>
          )}
          <button
            className={`item-sub-tab ${itemSubTab === 'locations' ? 'active' : ''}`}
            onClick={() => setItemSubTab('locations')}
          >
            Locations
          </button>
          <button
            className={`item-sub-tab ${itemSubTab === 'history' ? 'active' : ''}`}
            onClick={() => setItemSubTab('history')}
          >
            History
          </button>
          {selectedItem.hasVariants && (
            <button
              className={`item-sub-tab ${itemSubTab === 'variants' ? 'active' : ''}`}
              onClick={() => setItemSubTab('variants')}
            >
              Variants
            </button>
          )}
        </div>

        <div className="details-content">

          {/* Sub-tab content */}
          <div className="item-sub-content">
            {itemSubTab === 'overview' && renderOverviewView()}
            {itemSubTab === 'stock' && renderStockView()}
            {itemSubTab === 'tracking' && renderTrackingView()}
            {itemSubTab === 'locations' && renderLocationsView()}
            {itemSubTab === 'history' && renderHistoryView()}
            {itemSubTab === 'variants' && selectedItem.hasVariants && selectedItemId && (
              <VariantManagement
                itemId={selectedItemId}
                itemName={selectedItem.name}
                onVariantChange={async () => {
                  await loadVariants(selectedItemId);
                  await loadVariantStock(selectedItemId);
                }}
              />
            )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="item-master">
      {viewMode === 'add' && renderForm()}
      {viewMode === 'edit' && renderForm()}
      {(viewMode === 'list' || viewMode === 'details') && (
        <div className={`item-master-container ${selectedItemId && viewMode === 'details' ? 'split-view' : 'full-view'}`}>
          <div className="item-master-list-panel">
            {renderList()}
          </div>
          {viewMode === 'details' && selectedItemId && (
            <div className="item-master-details-panel">
              {selectedItem ? (
                renderDetails()
              ) : (
                <div className="item-details-placeholder">
                  <h3>No Item Selected</h3>
                  <p>Select an item from the list to view details</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        onConfirm={() => handleDelete()}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        variant="danger"
      />
      <ConfirmDialog
        isOpen={showBatchDisposeDialog}
        title="Dispose Batch"
        message={`Are you sure you want to dispose batch ${batchToDispose?.batchNumber}?`}
        onConfirm={() => {
          if (disposeReason.trim()) {
            handleDisposeBatch(disposeReason);
          } else {
            setError('Please provide a reason for disposal');
          }
        }}
        onCancel={() => {
          setShowBatchDisposeDialog(false);
          setBatchToDispose(null);
          setDisposeReason('');
        }}
        variant="danger"
        employeeName=""
      />
      {showBatchDisposeDialog && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Reason for Disposal *
          </label>
          <Input
            value={disposeReason}
            onChange={(e) => setDisposeReason(e.target.value)}
            placeholder="Enter reason for batch disposal"
            style={{ width: '100%' }}
          />
        </div>
      )}
      
      <ConfirmDialog
        isOpen={showUnsavedDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? All unsaved changes will be lost."
        onConfirm={() => {
          setHasUnsavedChanges(false);
          setShowUnsavedDialog(false);
          if (pendingNavigation) {
            pendingNavigation();
            setPendingNavigation(null);
          }
        }}
        onCancel={() => {
          setShowUnsavedDialog(false);
          setPendingNavigation(null);
        }}
        variant="warning"
      />
    </div>
  );
};
