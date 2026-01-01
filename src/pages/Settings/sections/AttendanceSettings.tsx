/**
 * Attendance Settings Section
 * Attendance-related preferences and settings
 */

import React, { useState, useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import {
  wifiService,
  WifiNetwork,
  CreateWifiNetworkRequest,
  UpdateWifiNetworkRequest,
} from '@/services/wifi.service';
import { WifiNetworkList } from '@/features/wifi/components/WifiNetworkList';
import { WifiNetworkForm } from '@/features/wifi/components/WifiNetworkForm';
import './AttendanceSettings.css';
// Import shared styles from PersonalSettings
import './PersonalSettings.css';

export const AttendanceSettings: React.FC = () => {
  const { user } = authStore();
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<WifiNetwork | undefined>();
  const [showInactive, setShowInactive] = useState(false);

  const canManageWifi = user?.role === UserRole.HR || user?.role === UserRole.ADMIN;

  useEffect(() => {
    if (canManageWifi) {
      loadNetworks();
    }
  }, [canManageWifi, showInactive]);

  const loadNetworks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await wifiService.getAllWifiNetworks(showInactive);
      setNetworks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Wi-Fi networks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNetwork = () => {
    setEditingNetwork(undefined);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEditNetwork = (network: WifiNetwork) => {
    setEditingNetwork(network);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingNetwork(undefined);
    setError(null);
  };

  const handleSubmitNetwork = async (
    data: CreateWifiNetworkRequest | UpdateWifiNetworkRequest
  ) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (editingNetwork) {
        // Update existing network
        await wifiService.updateWifiNetwork(editingNetwork.id, data as UpdateWifiNetworkRequest);
        setSuccess('Wi-Fi network updated successfully');
      } else {
        // Create new network
        await wifiService.createWifiNetwork(data as CreateWifiNetworkRequest);
        setSuccess('Wi-Fi network added successfully');
      }

      setShowForm(false);
      setEditingNetwork(undefined);
      await loadNetworks();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save Wi-Fi network');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNetwork = async (network: WifiNetwork) => {
    const networkName = network.connectionType === 'wifi' 
      ? network.ssid || 'WiFi network'
      : network.macAddress || 'Ethernet network';
    if (!window.confirm(`Are you sure you want to delete the ${network.connectionType === 'wifi' ? 'WiFi' : 'Ethernet'} network "${networkName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await wifiService.deleteWifiNetwork(network.id);
      setSuccess('Wi-Fi network deleted successfully');
      await loadNetworks();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete Wi-Fi network');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (network: WifiNetwork) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await wifiService.updateWifiNetwork(network.id, {
        isActive: !network.isActive,
      });

      setSuccess(`Wi-Fi network ${!network.isActive ? 'activated' : 'deactivated'} successfully`);
      await loadNetworks();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update Wi-Fi network status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-settings">
      <div className="settings-section-header">
        <h2>Attendance Settings</h2>
        <p className="settings-section-description">
          Configure your attendance preferences and Wi-Fi network management
        </p>
      </div>

      {error && <div className="settings-error">{error}</div>}
      {success && <div className="settings-success">{success}</div>}

      {/* Wi-Fi Network Management - HR/Admin Only */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Wi-Fi Network Management</h3>
          {canManageWifi && !showForm && (
            <button
              className="btn-edit"
              onClick={handleAddNetwork}
              disabled={loading}
            >
              Add Network
            </button>
          )}
        </div>

        <div className="settings-card-content">
          {!canManageWifi ? (
            <div className="wifi-management-restricted">
              <p className="settings-info-text">
                Wi-Fi network management is available to HR and Admin roles only.
                Please contact your HR department if you need to add or modify approved Wi-Fi networks.
              </p>
            </div>
          ) : showForm ? (
            <div className="wifi-network-form-container">
              <WifiNetworkForm
                network={editingNetwork}
                onSubmit={handleSubmitNetwork}
                onCancel={handleCancelForm}
                isLoading={loading}
              />
            </div>
          ) : (
            <>
              {networks.length > 0 && (
                <div className="wifi-list-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    <span>Show inactive networks</span>
                  </label>
                </div>
              )}

              {loading && networks.length === 0 ? (
                <div className="settings-section-loading">Loading Wi-Fi networks...</div>
              ) : (
                <WifiNetworkList
                  networks={networks}
                  onEdit={handleEditNetwork}
                  onDelete={handleDeleteNetwork}
                  onToggleActive={handleToggleActive}
                  isLoading={loading}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Notifications - Placeholder */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Notifications</h3>
        </div>
        <div className="settings-card-content">
          <p className="settings-info-text">
            Notification settings will be available in a future update.
          </p>
        </div>
      </div>

      {/* Attendance Reminders - Placeholder */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Attendance Reminders</h3>
        </div>
        <div className="settings-card-content">
          <p className="settings-info-text">
            Reminder settings will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
};

