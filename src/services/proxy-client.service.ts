/**
 * Proxy Client Service - Discover and connect to proxy servers
 */

import { api } from './api';
import { config } from '../config';

class ProxyClientService {
  private currentProxyUrl: string | null = null;

  /**
   * Discover proxy servers on local network
   * TODO: Implement mDNS/Bonjour discovery
   */
  async discoverProxies(): Promise<Array<{ ip: string; port: number }>> {
    // Placeholder - would use mDNS/Bonjour to discover _companyos-attendance-proxy._tcp
    // For now, return empty array (fallback to main server)
    return [];
  }

  /**
   * Connect to a proxy server
   */
  async connectToProxy(proxyUrl: string): Promise<void> {
    this.currentProxyUrl = proxyUrl;
    // Update API base URL to use proxy
    // This would need to be integrated with the api service
  }

  /**
   * Disconnect from proxy (use main server)
   */
  disconnectFromProxy(): void {
    this.currentProxyUrl = null;
  }

  /**
   * Check if proxy is available
   */
  isProxyAvailable(): boolean {
    return this.currentProxyUrl !== null;
  }

  /**
   * Get current proxy URL
   */
  getCurrentProxyUrl(): string | null {
    return this.currentProxyUrl;
  }

  /**
   * Auto-discover and connect to proxy
   */
  async autoConnect(): Promise<boolean> {
    const proxies = await this.discoverProxies();
    if (proxies.length > 0) {
      const proxy = proxies[0];
      await this.connectToProxy(`http://${proxy.ip}:${proxy.port}`);
      return true;
    }
    return false;
  }
}

export const proxyClientService = new ProxyClientService();

