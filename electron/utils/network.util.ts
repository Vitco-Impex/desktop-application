/**
 * Network Utility - Network detection functions
 * Extracted from main.ts to avoid circular dependencies
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

export interface NetworkInfo {
  type: 'wifi' | 'ethernet' | 'none';
  wifi?: {
    ssid: string;
    bssid: string | null;
  };
  ethernet?: {
    macAddress: string;
    adapterName?: string;
  };
}

/**
 * Get MAC address of Ethernet adapter
 * Cross-platform implementation
 */
export async function getEthernetMacAddress(): Promise<{ macAddress: string | null; adapterName?: string }> {
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      try {
        const { stdout: ipconfigOutput } = await execAsync('ipconfig /all');
        const ipconfigLines = ipconfigOutput.split(/\r?\n/);
        
        let currentAdapter = '';
        let currentMac = '';
        let hasIpAddress = false;
        const activeAdapters: Array<{ name: string; mac: string }> = [];
        
        for (let i = 0; i < ipconfigLines.length; i++) {
          const line = ipconfigLines[i].trim();
          
          if (line && line.endsWith(':') && !line.startsWith(' ') && !line.match(/^\d+\./)) {
            if (currentAdapter && currentMac) {
              if (!/wireless|wlan|wi-fi|802\.11|wifi|qualcomm.*wireless|qca.*wireless/i.test(currentAdapter)) {
                if (!/loopback|tunneling|isatap|teredo|6to4|vmware.*adapter|virtualbox.*adapter|hyper-v.*virtual|microsoft.*wifi.*direct|bluetooth/i.test(currentAdapter)) {
                  if (hasIpAddress) {
                    activeAdapters.unshift({ name: currentAdapter, mac: currentMac });
                  } else {
                    activeAdapters.push({ name: currentAdapter, mac: currentMac });
                  }
                }
              }
            }
            currentAdapter = line.replace(/:$/, '').trim();
            currentMac = '';
            hasIpAddress = false;
          }
          
          if (line.includes('Physical Address') || line.includes('Physical address')) {
            const macMatch = line.match(/([0-9A-F]{2}[:-]){5}([0-9A-F]{2})/i);
            if (macMatch && currentAdapter) {
              currentMac = macMatch[0].replace(/-/g, ':').toUpperCase();
            }
          }
          
          if (line.includes('IPv4 Address') && !line.includes('Autoconfiguration')) {
            const ipMatch = line.match(/IPv4 Address[^:]*:\s*(\d+\.\d+\.\d+\.\d+)(?:\(Preferred\))?/i);
            if (ipMatch && ipMatch[1] !== '0.0.0.0') {
              hasIpAddress = true;
            }
          }
        }
        
        if (currentAdapter && currentMac) {
          if (!/wireless|wlan|wi-fi|802\.11|wifi|qualcomm.*wireless|qca.*wireless/i.test(currentAdapter)) {
            if (!/loopback|tunneling|isatap|teredo|6to4|vmware.*adapter|virtualbox.*adapter|hyper-v.*virtual|microsoft.*wifi.*direct|bluetooth/i.test(currentAdapter)) {
              if (hasIpAddress) {
                activeAdapters.unshift({ name: currentAdapter, mac: currentMac });
              } else {
                activeAdapters.push({ name: currentAdapter, mac: currentMac });
              }
            }
          }
        }
        
        if (activeAdapters.length > 0) {
          const adapter = activeAdapters[0];
          return { macAddress: adapter.mac, adapterName: adapter.name };
        }
        
        try {
          const { stdout: getmacOutput } = await execAsync('getmac /fo csv /nh /v');
          const getmacLines = getmacOutput.trim().split(/\r?\n/).filter(line => line.trim());
          
          for (const line of getmacLines) {
            const csvMatch = line.match(/^"([^"]*)","([^"]*)","([0-9A-F-]{17})"/i);
            if (csvMatch) {
              const connectionName = csvMatch[1];
              const adapterName = csvMatch[2];
              const macAddress = csvMatch[3];
              
              if (/wireless|wlan|wi-fi|802\.11|wifi/i.test(connectionName) || /wireless|wlan|wi-fi|802\.11|wifi/i.test(adapterName)) {
                continue;
              }
              
              if (/bluetooth|microsoft.*wifi.*direct/i.test(adapterName)) {
                continue;
              }
              
              if (/ethernet/i.test(connectionName) || /ethernet|usb.*gb/i.test(adapterName)) {
                const mac = macAddress.replace(/-/g, ':').toUpperCase();
                return { macAddress: mac, adapterName: adapterName };
              }
            }
          }
        } catch {
          // Fallback failed
        }
        
        return { macAddress: null };
      } catch (error: any) {
        return { macAddress: null };
      }
    } else if (platform === 'darwin') {
      try {
        const { stdout: networksetup } = await execAsync('networksetup -listallhardwareports');
        const lines = networksetup.split(/\r?\n/);
        
        let currentPort = '';
        let currentDevice = '';
        
        for (const line of lines) {
          if (line.includes('Hardware Port:')) {
            currentPort = line.split(':')[1].trim();
          }
          if (line.includes('Device:')) {
            currentDevice = line.split(':')[1].trim();
            
            if (/Wi-Fi|AirPort/i.test(currentPort)) {
              continue;
            }
            
            if (currentDevice && currentDevice.startsWith('en')) {
              try {
                const { stdout: ifconfig } = await execAsync(`ifconfig ${currentDevice}`);
                const macMatch = ifconfig.match(/ether\s+([0-9a-f:]{17})/i);
                if (macMatch) {
                  return { macAddress: macMatch[1].toUpperCase(), adapterName: currentPort };
                }
              } catch {
                // Continue to next device
              }
            }
          }
        }
      } catch (error: any) {
        return { macAddress: null };
      }
    } else if (platform === 'linux') {
      try {
        const { stdout } = await execAsync('ip link show');
        const lines = stdout.split(/\r?\n/);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (/^\d+:\s+(wlan|wlp|wl-)/i.test(line)) {
            continue;
          }
          
          if (/^\d+:\s+(eth|enp|eno|ens|em)/i.test(line)) {
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            const macMatch = nextLine.match(/link\/ether\s+([0-9a-f:]{17})/i);
            if (macMatch) {
              const adapterMatch = line.match(/^\d+:\s+([^:]+):/);
              return { 
                macAddress: macMatch[1].toUpperCase(), 
                adapterName: adapterMatch ? adapterMatch[1].trim() : undefined 
              };
            }
          }
        }
      } catch (error: any) {
        return { macAddress: null };
      }
    }
  } catch (error) {
    return { macAddress: null };
  }
  
  return { macAddress: null };
}

/**
 * Get current Wi-Fi information (SSID and optional BSSID)
 * Cross-platform implementation
 */
export async function getCurrentWifi(): Promise<WifiInfo> {
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      try {
        const { stdout } = await execAsync('netsh wlan show interfaces');
        const lines = stdout.split(/\r?\n/);
        
        let ssid: string | null = null;
        let bssid: string | null = null;
        
        for (const line of lines) {
          if (/^\s*SSID\s*:/.test(line) && !/Profile/.test(line)) {
            const ssidPattern = /SSID\s*:\s*(.+)/i;
            const ssidMatch = line.match(ssidPattern);
            if (ssidMatch && ssidMatch[1]) {
              const foundSsid = ssidMatch[1].trim();
              if (foundSsid && foundSsid.toLowerCase() !== 'none' && foundSsid.length > 0) {
                ssid = foundSsid;
              }
            }
          }
          
          if (/BSSID\s*:/.test(line)) {
            const bssidPattern = /(?:AP\s+)?BSSID\s*:\s*([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})/i;
            const bssidMatch = line.match(bssidPattern);
            if (bssidMatch && bssidMatch[1]) {
              bssid = bssidMatch[1].replace(/-/g, ':').toUpperCase();
            }
          }
        }
        
        return { ssid, bssid };
      } catch (error: any) {
        return { ssid: null, bssid: null };
      }
    } else if (platform === 'darwin') {
      try {
        const airportPath = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
        const { stdout } = await execAsync(`${airportPath} -I`);
        const ssidMatch = stdout.match(/^\s*SSID:\s*(.+)$/m);
        const bssidMatch = stdout.match(/^\s*BSSID:\s*([0-9a-f:]{17})/mi);
        
        return {
          ssid: ssidMatch ? ssidMatch[1].trim() : null,
          bssid: bssidMatch ? bssidMatch[1].trim().toUpperCase() : null,
        };
      } catch (error) {
        const { stdout } = await execAsync('networksetup -getairportnetwork en0');
        const ssidMatch = stdout.match(/Current Wi-Fi Network:\s*(.+)/);
        
        return {
          ssid: ssidMatch ? ssidMatch[1].trim() : null,
          bssid: null,
        };
      }
    } else if (platform === 'linux') {
      try {
        const { stdout } = await execAsync('iwgetid -r');
        const ssid = stdout.trim();
        
        let bssid: string | null = null;
        try {
          const { stdout: bssidOutput } = await execAsync('iwgetid -ar');
          const bssidMatch = bssidOutput.match(/([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/);
          bssid = bssidMatch ? bssidMatch[0].toUpperCase() : null;
        } catch {
          // BSSID not available without root
        }
        
        return { ssid: ssid || null, bssid };
      } catch (error) {
        try {
          const { stdout } = await execAsync('nmcli -t -f active,ssid dev wifi | grep "^yes:" | head -1');
          const ssidMatch = stdout.match(/yes:(.+)/);
          return {
            ssid: ssidMatch ? ssidMatch[1].trim() : null,
            bssid: null,
          };
        } catch {
          return { ssid: null, bssid: null };
        }
      }
    }
  } catch (error) {
    return { ssid: null, bssid: null };
  }
  
  return { ssid: null, bssid: null };
}

/**
 * Get current network information (WiFi or Ethernet)
 * Returns WiFi info if connected via WiFi, Ethernet MAC if connected via Ethernet
 */
export async function getCurrentNetwork(): Promise<NetworkInfo> {
  try {
    const wifiInfo = await getCurrentWifi();
    
    if (wifiInfo.ssid && wifiInfo.ssid.trim() !== '') {
      return {
        type: 'wifi',
        wifi: {
          ssid: wifiInfo.ssid,
          bssid: wifiInfo.bssid || null,
        },
      };
    }
    
    const ethernetInfo = await getEthernetMacAddress();
    
    if (ethernetInfo.macAddress) {
      return {
        type: 'ethernet',
        ethernet: {
          macAddress: ethernetInfo.macAddress,
          adapterName: ethernetInfo.adapterName,
        },
      };
    }
    
    return { type: 'none' };
  } catch (error: any) {
    return { type: 'none' };
  }
}

