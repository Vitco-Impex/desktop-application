/**
 * Reports Settings Section
 * Reports preferences and export settings
 */

import React from 'react';
import './ReportsSettings.css';
// Import shared styles from PersonalSettings
import './PersonalSettings.css';

export const ReportsSettings: React.FC = () => {
  return (
    <div className="reports-settings">
      <div className="settings-section-header">
        <h2>Reports Settings</h2>
        <p className="settings-section-description">
          Configure your reports preferences and export options
        </p>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Export Preferences</h3>
        </div>
        <div className="settings-card-content">
          <p className="settings-info-text">
            Export settings will be available in a future update.
          </p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Report Templates</h3>
        </div>
        <div className="settings-card-content">
          <p className="settings-info-text">
            Report template customization will be available in a future update.
          </p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Default Date Range</h3>
        </div>
        <div className="settings-card-content">
          <p className="settings-info-text">
            Default date range preferences will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
};

