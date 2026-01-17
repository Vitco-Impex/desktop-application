/**
 * Wi-Fi Network List Component
 * Displays list of Wi-Fi networks with actions
 */

import React from 'react';
import { WifiNetwork } from '@/services/wifi.service';
import { formatDate } from '@/utils/date';
import './WifiNetworkList.css';

interface WifiNetworkListProps {
  networks: WifiNetwork[];
  onEdit: (network: WifiNetwork) => void;
  onDelete: (network: WifiNetwork) => void;
  onToggleActive: (network: WifiNetwork) => void;
  isLoading?: boolean;
}

export const WifiNetworkList: React.FC<WifiNetworkListProps> = ({
  networks,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
}) => {

  if (networks.length === 0) {
    return (
      <div className="wifi-network-list-empty">
        <p>No networks configured yet.</p>
        <p className="empty-subtitle">Click "Add Network" to add your first approved network (WiFi or Ethernet).</p>
      </div>
    );
  }

  return (
    <div className="wifi-network-list">
      <div className="wifi-network-table-container">
        <table className="wifi-network-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>SSID/Name</th>
              <th>BSSID/MAC Address</th>
              <th>Location</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {networks.map((network) => (
              <tr key={network.id} className={!network.isActive ? 'inactive' : ''}>
                <td className="type-cell">
                  <span className={`type-badge ${network.connectionType}`}>
                    {network.connectionType === 'wifi' ? 'WiFi' : 'Ethernet'}
                  </span>
                </td>
                <td className="ssid-cell">
                  <div className="ssid-content">
                    <span className="ssid-name">
                      {network.connectionType === 'wifi' 
                        ? network.ssid || '—'
                        : network.ssid || 'Ethernet'
                      }
                    </span>
                  </div>
                </td>
                <td className="bssid-cell">
                  {network.connectionType === 'wifi' ? (
                    network.bssid ? (
                      <code className="bssid-code">{network.bssid}</code>
                    ) : (
                      <span className="text-muted">—</span>
                    )
                  ) : (
                    network.macAddress ? (
                      <code className="bssid-code">{network.macAddress}</code>
                    ) : (
                      <span className="text-muted">—</span>
                    )
                  )}
                </td>
                <td className="location-cell">
                  {network.location || <span className="text-muted">—</span>}
                </td>
                <td className="status-cell">
                  <span className={`status-badge ${network.isActive ? 'active' : 'inactive'}`}>
                    {network.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="date-cell">
                  {formatDate(network.createdAt)}
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => onEdit(network)}
                      disabled={isLoading}
                      title="Edit network"
                    >
                      Edit
                    </button>
                    <button
                      className="btn-action btn-toggle"
                      onClick={() => onToggleActive(network)}
                      disabled={isLoading}
                      title={network.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {network.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => onDelete(network)}
                      disabled={isLoading}
                      title="Delete network"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

