/**
 * Wi-Fi Network Form Component
 * Used for creating and editing Wi-Fi networks
 */

import React, { useState, useEffect } from 'react';
import { CreateWifiNetworkRequest, UpdateWifiNetworkRequest, WifiNetwork } from '@/services/wifi.service';
import './WifiNetworkForm.css';

interface WifiNetworkFormProps {
  network?: WifiNetwork;
  onSubmit: (data: CreateWifiNetworkRequest | UpdateWifiNetworkRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const WifiNetworkForm: React.FC<WifiNetworkFormProps> = ({
  network,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    connectionType: (network?.connectionType || 'wifi') as 'wifi' | 'ethernet',
    ssid: network?.ssid || '',
    bssid: network?.bssid || '',
    macAddress: network?.macAddress || '',
    location: network?.location || '',
    isActive: network?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (network) {
      setFormData({
        connectionType: network.connectionType || 'wifi',
        ssid: network.ssid || '',
        bssid: network.bssid || '',
        macAddress: network.macAddress || '',
        location: network.location || '',
        isActive: network.isActive,
      });
    }
  }, [network]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.connectionType === 'wifi') {
      if (!formData.ssid.trim()) {
        newErrors.ssid = 'SSID is required for WiFi networks';
      } else if (formData.ssid.trim().length > 100) {
        newErrors.ssid = 'SSID must be less than 100 characters';
      }

      if (formData.bssid && formData.bssid.trim()) {
        const bssidPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!bssidPattern.test(formData.bssid.trim())) {
          newErrors.bssid = 'BSSID must be in format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX';
        }
      }

      if (formData.macAddress && formData.macAddress.trim()) {
        newErrors.macAddress = 'MAC address cannot be set for WiFi networks. Use BSSID instead.';
      }
    } else if (formData.connectionType === 'ethernet') {
      if (!formData.macAddress.trim()) {
        newErrors.macAddress = 'MAC address is required for Ethernet networks';
      } else {
        const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macPattern.test(formData.macAddress.trim())) {
          newErrors.macAddress = 'MAC address must be in format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX';
        }
      }

      if (formData.bssid && formData.bssid.trim()) {
        newErrors.bssid = 'BSSID cannot be set for Ethernet networks. Use MAC address instead.';
      }

      // SSID is optional for Ethernet (can be used as descriptive name)
      if (formData.ssid && formData.ssid.trim().length > 100) {
        newErrors.ssid = 'SSID must be less than 100 characters';
      }
    }

    if (formData.location && formData.location.trim().length > 200) {
      newErrors.location = 'Location must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Normalize BSSID format (convert - to :)
    let normalizedBssid = formData.bssid.trim();
    if (normalizedBssid) {
      normalizedBssid = normalizedBssid.replace(/-/g, ':').toUpperCase();
    }

    // Normalize MAC address format (convert - to :)
    let normalizedMacAddress = formData.macAddress.trim();
    if (normalizedMacAddress) {
      normalizedMacAddress = normalizedMacAddress.replace(/-/g, ':').toUpperCase();
    }

    const submitData: CreateWifiNetworkRequest | UpdateWifiNetworkRequest = {
      connectionType: formData.connectionType,
      ssid: formData.connectionType === 'wifi' ? formData.ssid.trim() : formData.ssid.trim() || undefined,
      bssid: formData.connectionType === 'wifi' ? (normalizedBssid || undefined) : undefined,
      macAddress: formData.connectionType === 'ethernet' ? normalizedMacAddress : undefined,
      location: formData.location.trim() || undefined,
      ...(network ? { isActive: formData.isActive } : {}),
    };

    await onSubmit(submitData);
  };

  const normalizeBssid = (value: string): string => {
    // Allow user to type with - or :, we'll normalize on submit
    return value.toUpperCase().replace(/[^0-9A-F:-]/g, '');
  };

  const normalizeMacAddress = (value: string): string => {
    // Allow user to type with - or :, we'll normalize on submit
    return value.toUpperCase().replace(/[^0-9A-F:-]/g, '');
  };

  const handleConnectionTypeChange = (newType: 'wifi' | 'ethernet') => {
    // Clear fields that don't apply to the new connection type
    const newFormData = { ...formData, connectionType: newType };
    if (newType === 'wifi') {
      newFormData.macAddress = '';
    } else {
      newFormData.bssid = '';
    }
    setFormData(newFormData);
    // Clear errors when switching types
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="wifi-network-form">
      <div className="form-group">
        <label htmlFor="connectionType">
          Connection Type *
        </label>
        <select
          id="connectionType"
          value={formData.connectionType}
          onChange={(e) => handleConnectionTypeChange(e.target.value as 'wifi' | 'ethernet')}
          className="form-input"
          disabled={isLoading || !!network}
        >
          <option value="wifi">WiFi</option>
          <option value="ethernet">Ethernet</option>
        </select>
        <small className="form-help">
          {network ? 'Connection type cannot be changed after creation' : 'Select the type of network connection'}
        </small>
      </div>

      {formData.connectionType === 'wifi' && (
        <>
          <div className="form-group">
            <label htmlFor="ssid">
              SSID (Network Name) *
            </label>
            <input
              id="ssid"
              type="text"
              value={formData.ssid}
              onChange={(e) => {
                setFormData({ ...formData, ssid: e.target.value });
                if (errors.ssid) setErrors({ ...errors, ssid: '' });
              }}
              className={`form-input ${errors.ssid ? 'error' : ''}`}
              placeholder="e.g., Office_WiFi"
              required
              disabled={isLoading}
            />
            {errors.ssid && <span className="form-error">{errors.ssid}</span>}
            <small className="form-help">
              The name of the Wi-Fi network (as it appears when connecting)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="bssid">
              BSSID (Access Point MAC) <span className="optional">(Optional)</span>
            </label>
            <input
              id="bssid"
              type="text"
              value={formData.bssid}
              onChange={(e) => {
                const normalized = normalizeBssid(e.target.value);
                setFormData({ ...formData, bssid: normalized });
                if (errors.bssid) setErrors({ ...errors, bssid: '' });
              }}
              className={`form-input ${errors.bssid ? 'error' : ''}`}
              placeholder="AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF"
              maxLength={17}
              disabled={isLoading}
            />
            {errors.bssid && <span className="form-error">{errors.bssid}</span>}
            <small className="form-help">
              Optional: MAC address of the access point. Use for more specific matching.
              Format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
            </small>
          </div>
        </>
      )}

      {formData.connectionType === 'ethernet' && (
        <>
          <div className="form-group">
            <label htmlFor="macAddress">
              MAC Address *
            </label>
            <input
              id="macAddress"
              type="text"
              value={formData.macAddress}
              onChange={(e) => {
                const normalized = normalizeMacAddress(e.target.value);
                setFormData({ ...formData, macAddress: normalized });
                if (errors.macAddress) setErrors({ ...errors, macAddress: '' });
              }}
              className={`form-input ${errors.macAddress ? 'error' : ''}`}
              placeholder="00:E0:4C:68:00:49 or 00-E0-4C-68-00-49"
              maxLength={17}
              required
              disabled={isLoading}
            />
            {errors.macAddress && <span className="form-error">{errors.macAddress}</span>}
            <small className="form-help">
              MAC address of the Ethernet adapter (e.g., from USB-to-Ethernet converter).
              Format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="ssid">
              Description/Name <span className="optional">(Optional)</span>
            </label>
            <input
              id="ssid"
              type="text"
              value={formData.ssid}
              onChange={(e) => {
                setFormData({ ...formData, ssid: e.target.value });
                if (errors.ssid) setErrors({ ...errors, ssid: '' });
              }}
              className={`form-input ${errors.ssid ? 'error' : ''}`}
              placeholder="e.g., Office Ethernet, USB Adapter"
              disabled={isLoading}
            />
            {errors.ssid && <span className="form-error">{errors.ssid}</span>}
            <small className="form-help">
              Optional: A descriptive name for this Ethernet connection (for your reference only)
            </small>
          </div>
        </>
      )}

      <div className="form-group">
        <label htmlFor="location">
          Location/Office <span className="optional">(Optional)</span>
        </label>
        <input
          id="location"
          type="text"
          value={formData.location}
          onChange={(e) => {
            setFormData({ ...formData, location: e.target.value });
            if (errors.location) setErrors({ ...errors, location: '' });
          }}
          className={`form-input ${errors.location ? 'error' : ''}`}
          placeholder="e.g., Main Office, Branch Office - Floor 2"
          disabled={isLoading}
        />
        {errors.location && <span className="form-error">{errors.location}</span>}
        <small className="form-help">
          Optional: Description of where this Wi-Fi network is located
        </small>
      </div>

      {network && (
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              disabled={isLoading}
            />
            <span>Active (Allow attendance on this network)</span>
          </label>
          <small className="form-help">
            Inactive networks will not allow attendance even if SSID matches
          </small>
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : network ? 'Update Network' : 'Add Network'}
        </button>
      </div>
    </form>
  );
};

