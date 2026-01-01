/**
 * System Logs Section
 * View and manage application logs
 */

import React, { useState, useEffect, useRef } from 'react';
import './SystemLogs.css';

declare global {
  interface Window {
    electronAPI?: {
      getLogPath: () => Promise<string>;
    };
  }
}

export const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logPath, setLogPath] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogPath();
    loadLogs();
    
    // Auto-refresh logs every 2 seconds
    const interval = setInterval(() => {
      loadLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const loadLogPath = async () => {
    try {
      if (window.electronAPI?.getLogPath) {
        const path = await window.electronAPI.getLogPath();
        setLogPath(path);
      }
    } catch (err) {
      console.error('Failed to get log path:', err);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // In Electron, we can't directly read files from renderer process
      // So we'll show a message and provide instructions
      // For now, we'll show console logs that are captured
      const consoleLogs = getConsoleLogs();
      setLogs(consoleLogs);
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const getConsoleLogs = (): string[] => {
    // This is a placeholder - in a real implementation, you'd need to:
    // 1. Capture console logs via IPC from main process
    // 2. Or read from log file via IPC
    // For now, return empty array and show instructions
    return [];
  };

  const clearLogs = () => {
    if (window.confirm('Are you sure you want to clear the logs? This action cannot be undone.')) {
      setLogs([]);
    }
  };

  const copyLogs = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      alert('Logs copied to clipboard');
    }).catch(() => {
      alert('Failed to copy logs');
    });
  };

  const openLogFile = async () => {
    if (logPath && window.electronAPI) {
      // Send IPC message to open log file in default editor
      // This would need to be implemented in main process
      alert(`Log file location:\n${logPath}\n\nPlease open this file manually in a text editor.`);
    } else {
      alert('Log file path not available');
    }
  };

  return (
    <div className="system-logs">
      <div className="settings-section-header">
        <h2>System Logs</h2>
        <p className="settings-section-description">
          View application logs and system information
        </p>
      </div>

      {error && <div className="settings-error">{error}</div>}

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Application Logs</h3>
          <div className="logs-actions">
            <button
              className="btn-secondary btn-sm"
              onClick={loadLogs}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={copyLogs}
              disabled={logs.length === 0}
            >
              Copy Logs
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              Clear
            </button>
            {logPath && (
              <button
                className="btn-secondary btn-sm"
                onClick={openLogFile}
              >
                Open Log File
              </button>
            )}
          </div>
        </div>

        <div className="settings-card-content">
          <div className="logs-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span>Auto-scroll to bottom</span>
            </label>
          </div>

          {logPath && (
            <div className="log-path-info">
              <small>Log file: <code>{logPath}</code></small>
            </div>
          )}

          <div className="logs-container">
            {logs.length === 0 ? (
              <div className="logs-empty">
                <p>No logs available</p>
                <p className="logs-empty-subtitle">
                  Logs are captured in the Electron main process console.
                  {logPath && (
                    <>
                      <br />
                      Open the log file manually at: <code>{logPath}</code>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="logs-content">
                {logs.map((log, index) => (
                  <div key={index} className="log-line">
                    <code>{log}</code>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>How to View Logs</h3>
        </div>
        <div className="settings-card-content">
          <div className="logs-instructions">
            <p><strong>Option 1: System Tray Menu</strong></p>
            <p>Right-click the HRMS Desktop icon in the system tray and select "View System Logs"</p>
            
            <p><strong>Option 2: Log File Location</strong></p>
            {logPath ? (
              <p>Logs are saved to: <code>{logPath}</code></p>
            ) : (
              <p>Logs are saved to the application's logs directory</p>
            )}
            <p>You can open this file in any text editor to view the logs.</p>

            <p><strong>Option 3: Developer Console</strong></p>
            <p>In development mode, logs are also displayed in the terminal/console where the application was started.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

