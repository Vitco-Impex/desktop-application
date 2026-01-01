/**
 * Wi-Fi Service - API calls for Wi-Fi validation and management
 */

import { api } from './api';

export interface WifiNetwork {
  id: string;
  connectionType: 'wifi' | 'ethernet';
  ssid?: string; // For WiFi only
  bssid?: string; // For WiFi only
  macAddress?: string; // For Ethernet only
  location?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WifiValidationRequest {
  ssid?: string; // For WiFi
  bssid?: string; // For WiFi
  macAddress?: string; // For Ethernet
}

export interface WifiValidationResponse {
  allowed: boolean;
  reason?: string;
  wifiNetworkId?: string;
}

export interface CreateWifiNetworkRequest {
  connectionType?: 'wifi' | 'ethernet';
  ssid?: string; // Required for WiFi
  bssid?: string; // Optional for WiFi
  macAddress?: string; // Required for Ethernet
  location?: string;
}

export interface UpdateWifiNetworkRequest {
  connectionType?: 'wifi' | 'ethernet';
  ssid?: string;
  bssid?: string;
  macAddress?: string;
  location?: string;
  isActive?: boolean;
}

class WifiService {
  /**
   * Validate network for attendance (WiFi or Ethernet)
   */
  async validateNetwork(request: WifiValidationRequest): Promise<WifiValidationResponse> {
    const response = await api.post('/wifi/validate', request);
    return response.data.data;
  }

  /**
   * Validate Wi-Fi network for attendance (deprecated, use validateNetwork)
   */
  async validateWifi(request: WifiValidationRequest): Promise<WifiValidationResponse> {
    return this.validateNetwork(request);
  }

  /**
   * Get all Wi-Fi networks (HR/Admin only)
   */
  async getAllWifiNetworks(includeInactive = false): Promise<WifiNetwork[]> {
    const response = await api.get('/wifi', {
      params: { includeInactive },
    });
    return response.data.data;
  }

  /**
   * Get Wi-Fi network by ID (HR/Admin only)
   */
  async getWifiNetworkById(id: string): Promise<WifiNetwork> {
    const response = await api.get(`/wifi/${id}`);
    return response.data.data;
  }

  /**
   * Create Wi-Fi network (HR/Admin only)
   */
  async createWifiNetwork(request: CreateWifiNetworkRequest): Promise<WifiNetwork> {
    const response = await api.post('/wifi', request);
    return response.data.data;
  }

  /**
   * Update Wi-Fi network (HR/Admin only)
   */
  async updateWifiNetwork(id: string, request: UpdateWifiNetworkRequest): Promise<WifiNetwork> {
    const response = await api.put(`/wifi/${id}`, request);
    return response.data.data;
  }

  /**
   * Delete Wi-Fi network (HR/Admin only)
   */
  async deleteWifiNetwork(id: string): Promise<void> {
    await api.delete(`/wifi/${id}`);
  }
}

export const wifiService = new WifiService();

