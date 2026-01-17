/**
 * Product Detail Page - Full-page product detail view
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryService, InventoryItem, InventoryVariant } from '@/services/inventory.service';
import { Button, Card } from '@/shared/components/ui';
import { LoadingState, EmptyState, ErrorState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog } from '@/shared/components/modals';
import { VariantManagement } from './VariantManagement';
import './ProductDetailPage.css';

type DetailTab = 'overview' | 'variants' | 'stock' | 'history' | 'settings';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getItemById(id);
      setItem(data);
      if (data.hasVariants) {
        const variantData = await inventoryService.getVariantsByItem(id);
        setVariants(variantData);
      }
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load product details');
      setError(message);
      logger.error('[ProductDetailPage] Failed to load item', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await inventoryService.deleteItem(id);
      navigate('/inventory');
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete product');
      setError(message);
      logger.error('[ProductDetailPage] Failed to delete item', err);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <LoadingState message="Loading product details..." />
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="product-detail-page">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="product-detail-page">
        <EmptyState message="Product not found" />
      </div>
    );
  }

  const allImages = item.images || [];
  const primaryImage = allImages.find(img => img.isPrimary) || allImages[0];

  return (
    <div className="product-detail-page">
      {/* Breadcrumb */}
      <div className="product-detail-breadcrumb">
        <button onClick={() => navigate('/inventory')} className="breadcrumb-link">
          Inventory
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{item.name}</span>
      </div>

      {/* Hero Section */}
      <div className="product-detail-hero">
        <div className="product-hero-image-section">
          {primaryImage ? (
            <div className="product-primary-image-container">
              <img
                src={primaryImage.url}
                alt={item.name}
                className="product-primary-image"
                onClick={() => setShowImageLightbox(true)}
              />
              {allImages.length > 1 && (
                <div className="product-image-counter">
                  {allImages.length} image{allImages.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="product-image-placeholder">
              <span>No Image</span>
            </div>
          )}
          
          {allImages.length > 1 && (
            <div className="product-image-thumbnails">
              {allImages.slice(0, 4).map((img, index) => (
                <img
                  key={img.publicId}
                  src={img.url}
                  alt={`${item.name} ${index + 1}`}
                  className={`thumbnail ${index === primaryImageIndex ? 'active' : ''}`}
                  onClick={() => setPrimaryImageIndex(index)}
                />
              ))}
              {allImages.length > 4 && (
                <div className="thumbnail-more">+{allImages.length - 4}</div>
              )}
            </div>
          )}
        </div>

        <div className="product-hero-info">
          <div className="product-hero-header">
            <div>
              <h1 className="product-hero-title">{item.name}</h1>
              <div className="product-hero-sku">SKU: {item.sku}</div>
              {item.category && (
                <div className="product-hero-category">{item.category}</div>
              )}
            </div>
            <div className="product-hero-actions">
              <span className={`status-badge ${item.isActive ? 'status-active' : 'status-inactive'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
              <Button variant="primary" onClick={() => navigate(`/inventory?edit=${item.id}`)}>
                Edit Product
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete
              </Button>
            </div>
          </div>

          {item.description && (
            <p className="product-hero-description">{item.description}</p>
          )}

          {/* Quick Info Grid */}
          <div className="product-quick-info">
            {item.costPrice !== undefined && (
              <div className="quick-info-item">
                <span className="quick-info-label">Cost Price</span>
                <span className="quick-info-value">${item.costPrice.toFixed(2)}</span>
              </div>
            )}
            {item.sellingPrice !== undefined && (
              <div className="quick-info-item">
                <span className="quick-info-label">Selling Price</span>
                <span className="quick-info-value">${item.sellingPrice.toFixed(2)}</span>
              </div>
            )}
            {item.margin !== undefined && (
              <div className="quick-info-item">
                <span className="quick-info-label">Margin</span>
                <span className="quick-info-value">{item.margin.toFixed(2)}%</span>
              </div>
            )}
            {item.supplierName && (
              <div className="quick-info-item">
                <span className="quick-info-label">Supplier</span>
                <span className="quick-info-value">{item.supplierName}</span>
              </div>
            )}
            {item.unitOfMeasure && (
              <div className="quick-info-item">
                <span className="quick-info-label">Unit</span>
                <span className="quick-info-value">{item.unitOfMeasure}</span>
              </div>
            )}
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="product-tags">
              {item.tags.map((tag, index) => (
                <span key={index} className="product-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="product-detail-tabs">
        <button
          className={`product-detail-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        {item.hasVariants && (
          <button
            className={`product-detail-tab ${activeTab === 'variants' ? 'active' : ''}`}
            onClick={() => setActiveTab('variants')}
          >
            Variants ({variants.length})
          </button>
        )}
        <button
          className={`product-detail-tab ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock
        </button>
        <button
          className={`product-detail-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`product-detail-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="product-detail-content">
        {activeTab === 'overview' && (
          <div className="product-overview">
            <div className="overview-grid">
              <Card className="overview-card">
                <h3>Basic Information</h3>
                <div className="overview-item">
                  <span className="overview-label">SKU:</span>
                  <span className="overview-value">{item.sku}</span>
                </div>
                {item.barcode && (
                  <div className="overview-item">
                    <span className="overview-label">Barcode:</span>
                    <span className="overview-value">{item.barcode}</span>
                  </div>
                )}
                <div className="overview-item">
                  <span className="overview-label">Category:</span>
                  <span className="overview-value">{item.category || '-'}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Unit of Measure:</span>
                  <span className="overview-value">{item.unitOfMeasure}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Status:</span>
                  <span className={`overview-value ${item.isActive ? 'status-active' : 'status-inactive'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </Card>

              {(item.costPrice !== undefined || item.sellingPrice !== undefined || item.supplierName) && (
                <Card className="overview-card">
                  <h3>Pricing & Supplier</h3>
                  {item.costPrice !== undefined && (
                    <div className="overview-item">
                      <span className="overview-label">Cost Price:</span>
                      <span className="overview-value">${item.costPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {item.sellingPrice !== undefined && (
                    <div className="overview-item">
                      <span className="overview-label">Selling Price:</span>
                      <span className="overview-value">${item.sellingPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {item.margin !== undefined && (
                    <div className="overview-item">
                      <span className="overview-label">Margin:</span>
                      <span className="overview-value">{item.margin.toFixed(2)}%</span>
                    </div>
                  )}
                  {item.supplierName && (
                    <div className="overview-item">
                      <span className="overview-label">Supplier:</span>
                      <span className="overview-value">{item.supplierName}</span>
                    </div>
                  )}
                  {item.supplierCode && (
                    <div className="overview-item">
                      <span className="overview-label">Supplier Code:</span>
                      <span className="overview-value">{item.supplierCode}</span>
                    </div>
                  )}
                </Card>
              )}

              {(item.dimensions || item.weight) && (
                <Card className="overview-card">
                  <h3>Dimensions & Weight</h3>
                  {item.dimensions && (
                    <>
                      <div className="overview-item">
                        <span className="overview-label">Length:</span>
                        <span className="overview-value">{item.dimensions.length} {item.dimensions.unit}</span>
                      </div>
                      <div className="overview-item">
                        <span className="overview-label">Width:</span>
                        <span className="overview-value">{item.dimensions.width} {item.dimensions.unit}</span>
                      </div>
                      <div className="overview-item">
                        <span className="overview-label">Height:</span>
                        <span className="overview-value">{item.dimensions.height} {item.dimensions.unit}</span>
                      </div>
                    </>
                  )}
                  {item.weight && (
                    <div className="overview-item">
                      <span className="overview-label">Weight:</span>
                      <span className="overview-value">{item.weight.value} {item.weight.unit}</span>
                    </div>
                  )}
                </Card>
              )}

              <Card className="overview-card">
                <h3>Industry Flags</h3>
                <div className="overview-item">
                  <span className="overview-label">Industry Type:</span>
                  <span className="overview-value">{item.industryFlags.industryType}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Perishable:</span>
                  <span className="overview-value">{item.industryFlags.isPerishable ? 'Yes' : 'No'}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Batch Tracking:</span>
                  <span className="overview-value">{item.industryFlags.requiresBatchTracking ? 'Yes' : 'No'}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Serial Tracking:</span>
                  <span className="overview-value">{item.industryFlags.requiresSerialTracking ? 'Yes' : 'No'}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Expiry Date:</span>
                  <span className="overview-value">{item.industryFlags.hasExpiryDate ? 'Yes' : 'No'}</span>
                </div>
              </Card>

              {(item.minStockLevel !== undefined || item.maxStockLevel !== undefined || item.reorderPoint !== undefined) && (
                <Card className="overview-card">
                  <h3>Stock Levels</h3>
                  {item.minStockLevel !== undefined && (
                    <div className="overview-item">
                      <span className="overview-label">Min Stock:</span>
                      <span className="overview-value">{item.minStockLevel}</span>
                    </div>
                  )}
                  {item.maxStockLevel !== undefined && (
                    <div className="overview-item">
                      <span className="overview-label">Max Stock:</span>
                      <span className="overview-value">{item.maxStockLevel}</span>
                    </div>
                  )}
                  {item.reorderPoint !== undefined && (
                    <div className="overview-item">
                      <span className="overview-label">Reorder Point:</span>
                      <span className="overview-value">{item.reorderPoint}</span>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'variants' && item.hasVariants && id && (
          <div className="product-variants-tab">
            <VariantManagement
              itemId={id}
              itemName={item.name}
              onVariantChange={async () => {
                const variantData = await inventoryService.getVariantsByItem(id);
                setVariants(variantData);
              }}
            />
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="product-stock-tab">
            <p>Stock information will be displayed here</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="product-history-tab">
            <p>Movement history will be displayed here</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="product-settings-tab">
            <Button variant="primary" onClick={() => navigate(`/inventory?edit=${item.id}`)}>
              Edit Product
            </Button>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {showImageLightbox && allImages.length > 0 && (
        <div className="image-lightbox" onClick={() => setShowImageLightbox(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setShowImageLightbox(false)}>×</button>
            <img src={allImages[primaryImageIndex].url} alt={item.name} />
            {allImages.length > 1 && (
              <>
                <button
                  className="lightbox-nav lightbox-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrimaryImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                  }}
                >
                  ‹
                </button>
                <button
                  className="lightbox-nav lightbox-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrimaryImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
};
