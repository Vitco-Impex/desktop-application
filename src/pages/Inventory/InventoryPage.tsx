/**
 * Inventory Page - Desktop
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ItemMaster } from '@/features/inventory/components/ItemMaster';
import { LocationManagement } from '@/features/inventory/components/LocationManagement';
import { MovementManagement } from '@/features/inventory/components/MovementManagement';
import { InventoryReports } from '@/features/inventory/components/InventoryReports';
import { InventorySettings } from '@/features/inventory/components/InventorySettings';
import './InventoryPage.css';

type InventoryTab = 'items' | 'locations' | 'movements' | 'reports' | 'settings';

export const InventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<InventoryTab>('items');

  useEffect(() => {
    // Check if edit param is present
    const editId = searchParams.get('edit');
    if (editId) {
      // This will be handled by ItemMaster component
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+R for quick receipt
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        setActiveTab('movements');
        // Trigger quick receipt in MovementManagement component
        window.dispatchEvent(new CustomEvent('quick-receipt'));
      }
      // Ctrl+T for quick transfer
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setActiveTab('movements');
        // Trigger quick transfer in MovementManagement component
        window.dispatchEvent(new CustomEvent('quick-transfer'));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="inventory-page">
      <div className="inventory-page-header">
        <div>
          <h1>Inventory Management</h1>
          <p className="page-subtitle">Manage inventory items and locations</p>
        </div>
        <div className="quick-actions-header">
          <Button
            variant="primary"
            onClick={() => {
              setActiveTab('movements');
              window.dispatchEvent(new CustomEvent('quick-receipt'));
            }}
            title="Quick Receipt (Ctrl+R)"
          >
            Quick Receipt
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setActiveTab('movements');
              window.dispatchEvent(new CustomEvent('quick-transfer'));
            }}
            title="Quick Transfer (Ctrl+T)"
          >
            Quick Transfer
          </Button>
        </div>
      </div>

      <div className="inventory-page-tabs">
        <button
          className={`inventory-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Item Master
        </button>
        <button
          className={`inventory-tab ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          Location Management
        </button>
        <button
          className={`inventory-tab ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          Stock Movements
        </button>
        <button
          className={`inventory-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={`inventory-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="inventory-page-content">
        {activeTab === 'items' && <ItemMaster />}
        {activeTab === 'locations' && <LocationManagement />}
        {activeTab === 'movements' && <MovementManagement />}
        {activeTab === 'reports' && <InventoryReports />}
        {activeTab === 'settings' && <InventorySettings />}
      </div>
    </div>
  );
};
