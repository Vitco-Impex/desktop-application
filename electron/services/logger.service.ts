/**
 * Logger Service - Logging for auto attendance system
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Local type definitions
type AutoCheckInTrigger = 'app_start' | 'login' | 'network_change' | 'system_wake' | 'checkout_shutdown' | 'checkout_logout' | 'checkout_recovery' | 'checkout_background';

const LOG_FILE = 'auto-attendance.log';
const MAX_LOG_AGE_DAYS = 7;

class LoggerService {
  private logDir: string;
  private logPath: string;

  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logPath = path.join(this.logDir, LOG_FILE);

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Clean old logs on startup
    this.cleanOldLogs();
  }

  /**
   * Format log entry
   */
  private formatLogEntry(
    trigger: AutoCheckInTrigger,
    status: 'success' | 'failed' | 'skipped',
    reason?: string,
    metadata?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    const reasonStr = reason ? ` - ${reason}` : '';
    return `[${timestamp}] [${trigger}] [${status}]${reasonStr}${metadataStr}\n`;
  }

  /**
   * Write log entry
   */
  private writeLog(entry: string): void {
    try {
      fs.appendFileSync(this.logPath, entry, 'utf-8');
    } catch (error) {
      console.error('[LoggerService] Failed to write log:', error);
    }
  }

  /**
   * Log auto check-in attempt
   */
  logAttempt(
    trigger: AutoCheckInTrigger,
    status: 'success' | 'failed' | 'skipped',
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.formatLogEntry(trigger, status, reason, metadata);
    this.writeLog(entry);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
 
    }
  }

  /**
   * Clean old log files (older than MAX_LOG_AGE_DAYS)
   */
  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        if (file.startsWith('auto-attendance') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            fs.unlinkSync(filePath);
             
          }
        }
      });
    } catch (error) {
      console.error('[LoggerService] Failed to clean old logs:', error);
    }
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Read recent log entries (last N lines)
   */
  readRecentLogs(lines: number = 100): string[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const content = fs.readFileSync(this.logPath, 'utf-8');
      const allLines = content.split('\n').filter((line) => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error('[LoggerService] Failed to read logs:', error);
      return [];
    }
  }
}

export const loggerService = new LoggerService();

