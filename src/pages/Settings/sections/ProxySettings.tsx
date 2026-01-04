/**
 * Proxy Settings Section
 * Allow users with proxy permission to enable/disable proxy server mode
 */

import React, { useState, useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { employeeService } from '@/services/employee.service';
import { ProxyServerStatus } from '@/types';
import './ProxySettings.css';

export const ProxySettings: React.FC = () => {
  const { user } = authStore();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<ProxyServerStatus>({
    isRunning: false,
    port: 3002,
    ipAddress: null,
    connectedClients: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);

  useEffect(() => {
    if (user?.id) {
      checkProxyPermission();
    }
  }, [user?.id]);

  // Load proxy status on mount and periodically
  useEffect(() => {
    if (!hasPermission || !window.electronAPI) return;

    const loadProxyStatus = async () => {
      try {
        const result = await window.electronAPI.getProxyStatus();
        if (result.success) {
          setServerStatus({
            isRunning: result.isRunning || false,
            port: result.port || 3002,
            connectedClients: result.connectedClients || 0,
            ipAddress: result.isRunning ? (result.ipAddress || null) : null,
          });
        }
      } catch (err) {
        console.error('Failed to load proxy status:', err);
      }
    };

    loadProxyStatus();
    const interval = setInterval(loadProxyStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [hasPermission]);

  const checkProxyPermission = async () => {
    if (!user?.id) return;
    
    try {
      setCheckingPermission(true);
      // Admins automatically have proxy permission
      if (user.role === 'admin') {
        setHasPermission(true);
        return;
      }
      
      // For non-admins, check explicit permission
      const permission = await employeeService.getProxyPermission(user.id);
      setHasPermission(permission.canActAsProxy);
    } catch (err: any) {
      console.error('Failed to check proxy permission:', err);
      // If user is admin, still allow (fallback)
      setHasPermission(user?.role === 'admin');
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleToggleProxy = async (enabled: boolean) => {
    if (!hasPermission) {
      setError('You do not have permission to act as a proxy server. Please contact your administrator.');
      return;
    }

    if (!window.electronAPI) {
      setError('Electron API is not available. Please ensure you are running the desktop application.');
      return;
    }

    // Check if proxy methods are available
    if (typeof window.electronAPI.startProxyServer !== 'function' || typeof window.electronAPI.stopProxyServer !== 'function') {
      setError('Proxy server functionality is not available. Please restart the application.');
      console.error('Missing proxy methods:', {
        hasStartProxyServer: typeof window.electronAPI.startProxyServer,
        hasStopProxyServer: typeof window.electronAPI.stopProxyServer,
        hasGetProxyStatus: typeof window.electronAPI.getProxyStatus,
        electronAPI: Object.keys(window.electronAPI || {}),
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (enabled) {
        // Start proxy server via Electron IPC
        const result = await window.electronAPI.startProxyServer();
        if (result.success) {
          setServerStatus({
            isRunning: true,
            port: result.port || 3002,
            ipAddress: result.ipAddress || null,
            connectedClients: 0,
          });
        } else {
          throw new Error(result.error || 'Failed to start proxy server');
        }
      } else {
        // Stop proxy server via Electron IPC
        const result = await window.electronAPI.stopProxyServer();
        if (result.success) {
          setServerStatus({
            isRunning: false,
            port: 3002,
            ipAddress: null,
            connectedClients: 0,
          });
        } else {
          throw new Error(result.error || 'Failed to stop proxy server');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle proxy server');
    } finally {
      setLoading(false);
    }
  };

  if (checkingPermission) {
    return (
      <div className="proxy-settings">
        <div className="settings-loading">Checking permissions...</div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="proxy-settings">
        <div className="proxy-no-permission">
          <h3>Proxy Server Mode</h3>
          <p>You do not have permission to act as a proxy server.</p>
          <p className="proxy-hint">
            Contact your administrator to request proxy server permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="proxy-settings">
      <div className="settings-section-header">
        <h2>Proxy Server Settings</h2>
        <p className="settings-section-description">
          Enable proxy server mode to allow other devices on your network to route attendance requests through this device.
        </p>
      </div>

      {error && (
        <div className="settings-error">
          {error}
          <button className="error-dismiss" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="proxy-controls">
        <div className="proxy-toggle-section">
          <div className="proxy-toggle-info">
            <label className="proxy-toggle-label">Proxy Server Mode</label>
            <p className="proxy-toggle-description">
              When enabled, this device will act as a proxy server for attendance requests from other devices on the same network.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={serverStatus.isRunning}
              onChange={(e) => handleToggleProxy(e.target.checked)}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {serverStatus.isRunning && (
          <div className="proxy-status">
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className="status-value status-running">Running</span>
            </div>
            {serverStatus.ipAddress && (
              <div className="status-item">
                <span className="status-label">IP Address:</span>
                <span className="status-value">{serverStatus.ipAddress}</span>
              </div>
            )}
            <div className="status-item">
              <span className="status-label">Port:</span>
              <span className="status-value">{serverStatus.port}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Connected Clients:</span>
              <span className="status-value">{serverStatus.connectedClients}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

