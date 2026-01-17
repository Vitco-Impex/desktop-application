/**
 * Location Management Component - Manage location hierarchy
 */

import React, { useState, useEffect } from 'react';
import {
  inventoryService,
  Location,
  CreateLocationRequest,
  UpdateLocationRequest,
  LocationType,
  LocationHierarchyResponse,
} from '@/services/inventory.service';
import { Button, Input, Card, Select } from '@/shared/components/ui';
import { LoadingState, EmptyState, ErrorState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import { ConfirmDialog } from '@/shared/components/modals';
import './LocationManagement.css';

type ViewMode = 'list' | 'hierarchy' | 'details' | 'add' | 'edit';

export const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [hierarchy, setHierarchy] = useState<LocationHierarchyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [filterType, setFilterType] = useState<LocationType | ''>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateLocationRequest>({
    code: '',
    name: '',
    type: LocationType.WAREHOUSE,
    address: '',
  });

  useEffect(() => {
    loadLocations();
  }, [filterType]);

  useEffect(() => {
    if (viewMode === 'hierarchy') {
      loadHierarchy();
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedLocationId && viewMode === 'details') {
      loadLocationDetails();
    }
  }, [selectedLocationId, viewMode]);

  const loadLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getAllLocations({
        type: filterType || undefined,
      });
      setLocations(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load locations');
      setError(message);
      logger.error('[LocationManagement] Failed to load locations', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHierarchy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getLocationHierarchy();
      setHierarchy(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load location hierarchy');
      setError(message);
      logger.error('[LocationManagement] Failed to load hierarchy', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationDetails = async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getLocationById(selectedLocationId);
      setSelectedLocation(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load location details');
      setError(message);
      logger.error('[LocationManagement] Failed to load location details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.createLocation(formData);
      setSuccess('Location created successfully');
      setViewMode('list');
      setFormData({
        code: '',
        name: '',
        type: LocationType.WAREHOUSE,
        address: '',
      });
      loadLocations();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to create location');
      setError(message);
      logger.error('[LocationManagement] Failed to create location', err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedLocationId) return;
    setError(null);
    setSuccess(null);
    try {
      const updateData: UpdateLocationRequest = {
        name: formData.name,
        address: formData.address,
        capacity: formData.capacity,
        temperatureZone: formData.temperatureZone,
      };
      await inventoryService.updateLocation(selectedLocationId, updateData);
      setSuccess('Location updated successfully');
      setViewMode('list');
      loadLocations();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to update location');
      setError(message);
      logger.error('[LocationManagement] Failed to update location', err);
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    setError(null);
    setSuccess(null);
    try {
      await inventoryService.deleteLocation(locationToDelete);
      setSuccess('Location deleted successfully');
      setShowDeleteConfirm(false);
      setLocationToDelete(null);
      if (selectedLocationId === locationToDelete) {
        setViewMode('list');
        setSelectedLocationId(null);
      }
      loadLocations();
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete location');
      setError(message);
      logger.error('[LocationManagement] Failed to delete location', err);
    }
  };

  const handleEdit = () => {
    if (!selectedLocation) return;
    setFormData({
      code: selectedLocation.code,
      name: selectedLocation.name,
      type: selectedLocation.type,
      address: selectedLocation.address || '',
      capacity: selectedLocation.capacity,
      temperatureZone: selectedLocation.temperatureZone,
    });
    setViewMode('edit');
  };

  const renderLocationTree = (location: LocationHierarchyResponse, level: number = 0) => {
    const indent = level * 20;
    return (
      <div key={location.id} style={{ marginLeft: `${indent}px` }}>
        <div
          className="location-tree-item"
          onClick={() => {
            setSelectedLocationId(location.id);
            setViewMode('details');
          }}
        >
          <span className="location-code">{location.code}</span>
          <span className="location-name">{location.name}</span>
          <span className="location-type">{location.type}</span>
          <span className={location.isActive ? 'status-active' : 'status-inactive'}>
            {location.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {location.children && location.children.map((child) => renderLocationTree(child, level + 1))}
      </div>
    );
  };

  const renderList = () => (
    <div className="location-management-list">
      <div className="location-management-toolbar">
        <div className="location-management-filters">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LocationType | '')}
            style={{ width: '200px' }}
          >
            <option value="">All Types</option>
            {Object.values(LocationType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
        <div className="location-management-actions">
          <Button variant="secondary" onClick={() => setViewMode('hierarchy')}>
            View Hierarchy
          </Button>
          <Button variant="primary" onClick={() => setViewMode('add')}>
            Add Location
          </Button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <LoadingState message="Loading locations..." />
      ) : locations.length === 0 ? (
        <EmptyState message="No locations found" />
      ) : (
        <div className="location-management-table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Level</th>
                <th>Parent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr
                  key={location.id}
                  onClick={() => {
                    setSelectedLocationId(location.id);
                    setViewMode('details');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{location.code}</td>
                  <td>{location.name}</td>
                  <td>{location.type}</td>
                  <td>{location.level}</td>
                  <td>{location.parentLocation?.name || '-'}</td>
                  <td>
                    <span className={location.isActive ? 'status-active' : 'status-inactive'}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLocationId(location.id);
                        setViewMode('details');
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocationToDelete(location.id);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderHierarchy = () => (
    <div className="location-hierarchy">
      <div className="location-hierarchy-header">
        <h2>Location Hierarchy</h2>
        <Button variant="secondary" onClick={() => setViewMode('list')}>
          Back to List
        </Button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <LoadingState message="Loading hierarchy..." />
      ) : (
        <div className="location-tree">
          {hierarchy.map((location) => renderLocationTree(location))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <Card className="location-management-form">
      <h2>{viewMode === 'add' ? 'Add New Location' : 'Edit Location'}</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Code *</label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          disabled={viewMode === 'edit'}
          placeholder="WH-001"
        />
      </div>

      <div className="form-group">
        <label>Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Location Name"
        />
      </div>

      <div className="form-group">
        <label>Type *</label>
        <Select
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value as LocationType })
          }
          disabled={viewMode === 'edit'}
        >
          {Object.values(LocationType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>

      {formData.type !== LocationType.WAREHOUSE && (
        <div className="form-group">
          <label>Parent Location</label>
          <Select
            value={formData.parentLocationId || ''}
            onChange={(e) =>
              setFormData({ ...formData, parentLocationId: e.target.value || undefined })
            }
            disabled={viewMode === 'edit'}
          >
            <option value="">Select Parent Location</option>
            {locations
              .filter((loc) => {
                if (formData.type === LocationType.ZONE) {
                  return loc.type === LocationType.WAREHOUSE;
                } else if (formData.type === LocationType.RACK) {
                  return loc.type === LocationType.ZONE;
                } else if (formData.type === LocationType.BIN) {
                  return loc.type === LocationType.RACK;
                }
                return false;
              })
              .map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
          </Select>
        </div>
      )}

      <div className="form-group">
        <label>Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={3}
          placeholder="Location address"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Max Weight (kg)</label>
          <Input
            type="number"
            value={formData.capacity?.maxWeight || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: {
                  ...formData.capacity,
                  maxWeight: e.target.value ? parseFloat(e.target.value) : undefined,
                },
              })
            }
          />
        </div>
        <div className="form-group">
          <label>Max Volume (m³)</label>
          <Input
            type="number"
            value={formData.capacity?.maxVolume || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: {
                  ...formData.capacity,
                  maxVolume: e.target.value ? parseFloat(e.target.value) : undefined,
                },
              })
            }
          />
        </div>
        <div className="form-group">
          <label>Max Items</label>
          <Input
            type="number"
            value={formData.capacity?.maxItems || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: {
                  ...formData.capacity,
                  maxItems: e.target.value ? parseInt(e.target.value, 10) : undefined,
                },
              })
            }
          />
        </div>
      </div>

      <div className="form-group">
        <label>Temperature Zone</label>
        <Select
          value={formData.temperatureZone || ''}
          onChange={(e) =>
            setFormData({ ...formData, temperatureZone: e.target.value || undefined })
          }
        >
          <option value="">None</option>
          <option value="frozen">Frozen</option>
          <option value="cold">Cold</option>
          <option value="ambient">Ambient</option>
        </Select>
      </div>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => setViewMode('list')}>
          Cancel
        </Button>
        <Button variant="primary" onClick={viewMode === 'add' ? handleCreate : handleUpdate}>
          {viewMode === 'add' ? 'Create' : 'Update'}
        </Button>
      </div>
    </Card>
  );

  const renderDetails = () => {
    if (!selectedLocation) {
      return <LoadingState message="Loading location details..." />;
    }

    return (
      <Card className="location-management-details">
        <div className="details-header">
          <h2>{selectedLocation.name}</h2>
          <div className="details-actions">
            <Button variant="secondary" onClick={() => setViewMode('list')}>
              Back to List
            </Button>
            <Button variant="primary" onClick={handleEdit}>
              Edit
            </Button>
          </div>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h3>Basic Information</h3>
            <div className="details-grid">
              <div>
                <label>Code</label>
                <div>{selectedLocation.code}</div>
              </div>
              <div>
                <label>Name</label>
                <div>{selectedLocation.name}</div>
              </div>
              <div>
                <label>Type</label>
                <div>{selectedLocation.type}</div>
              </div>
              <div>
                <label>Level</label>
                <div>{selectedLocation.level}</div>
              </div>
              <div>
                <label>Parent Location</label>
                <div>{selectedLocation.parentLocation?.name || '-'}</div>
              </div>
              <div>
                <label>Status</label>
                <div>
                  <span className={selectedLocation.isActive ? 'status-active' : 'status-inactive'}>
                    {selectedLocation.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedLocation.address && (
            <div className="details-section">
              <h3>Address</h3>
              <p>{selectedLocation.address}</p>
            </div>
          )}

          {selectedLocation.capacity && (
            <div className="details-section">
              <h3>Capacity</h3>
              <div className="details-grid">
                {selectedLocation.capacity.maxWeight && (
                  <div>
                    <label>Max Weight</label>
                    <div>{selectedLocation.capacity.maxWeight} kg</div>
                  </div>
                )}
                {selectedLocation.capacity.maxVolume && (
                  <div>
                    <label>Max Volume</label>
                    <div>{selectedLocation.capacity.maxVolume} m³</div>
                  </div>
                )}
                {selectedLocation.capacity.maxItems && (
                  <div>
                    <label>Max Items</label>
                    <div>{selectedLocation.capacity.maxItems}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedLocation.temperatureZone && (
            <div className="details-section">
              <h3>Temperature Zone</h3>
              <div>{selectedLocation.temperatureZone}</div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="location-management">
      {viewMode === 'list' && renderList()}
      {viewMode === 'hierarchy' && renderHierarchy()}
      {viewMode === 'add' && renderForm()}
      {viewMode === 'edit' && renderForm()}
      {viewMode === 'details' && renderDetails()}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Location"
        message="Are you sure you want to delete this location? This action cannot be undone."
        onConfirm={() => handleDelete()}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setLocationToDelete(null);
        }}
        variant="danger"
      />
    </div>
  );
};
