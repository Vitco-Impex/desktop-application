/**
 * Config Service - User preferences for auto attendance
 */

import { storageService } from './storage.service';

// Local type definitions
interface AutoAttendanceConfig {
  autoCheckInEnabled: boolean;
  autoStartEnabled: boolean;
  showNotifications: boolean;
  autoCheckoutOnShutdownEnabled?: boolean;
  checkoutTimeout?: number; // in seconds
  checkoutNotificationsEnabled?: boolean;
}

class ConfigService {
  /**
   * Get current config
   */
  getConfig(): AutoAttendanceConfig {
    return storageService.getConfig();
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<AutoAttendanceConfig>): void {
    storageService.updateConfig(updates);
  }

  /**
   * Check if auto check-in is enabled
   */
  isAutoCheckInEnabled(): boolean {
    return this.getConfig().autoCheckInEnabled;
  }

  /**
   * Set auto check-in enabled
   */
  setAutoCheckInEnabled(enabled: boolean): void {
    this.updateConfig({ autoCheckInEnabled: enabled });
  }

  /**
   * Check if auto-start is enabled
   */
  isAutoStartEnabled(): boolean {
    return this.getConfig().autoStartEnabled;
  }

  /**
   * Set auto-start enabled
   */
  setAutoStartEnabled(enabled: boolean): void {
    this.updateConfig({ autoStartEnabled: enabled });
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return this.getConfig().showNotifications;
  }

  /**
   * Set notifications enabled
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.updateConfig({ showNotifications: enabled });
  }

  /**
   * Check if auto check-out on shutdown is enabled
   */
  isAutoCheckoutOnShutdownEnabled(): boolean {
    const config = this.getConfig();
    return config.autoCheckoutOnShutdownEnabled !== false; // Default to true
  }

  /**
   * Set auto check-out on shutdown enabled
   */
  setAutoCheckoutOnShutdownEnabled(enabled: boolean): void {
    this.updateConfig({ autoCheckoutOnShutdownEnabled: enabled });
  }

  /**
   * Get check-out timeout in seconds
   */
  getCheckoutTimeout(): number {
    const config = this.getConfig();
    return config.checkoutTimeout || 30; // Default 30 seconds
  }

  /**
   * Set check-out timeout in seconds
   */
  setCheckoutTimeout(timeout: number): void {
    this.updateConfig({ checkoutTimeout: timeout });
  }

  /**
   * Check if check-out notifications are enabled
   */
  areCheckoutNotificationsEnabled(): boolean {
    const config = this.getConfig();
    return config.checkoutNotificationsEnabled !== false; // Default to true
  }

  /**
   * Set check-out notifications enabled
   */
  setCheckoutNotificationsEnabled(enabled: boolean): void {
    this.updateConfig({ checkoutNotificationsEnabled: enabled });
  }
}

export const configService = new ConfigService();

