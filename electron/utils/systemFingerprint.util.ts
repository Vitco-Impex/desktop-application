/**
 * System Fingerprint Utility for Electron Main Process
 * Generates a unique fingerprint for the system/device using Node.js APIs
 */

import * as os from 'os';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Generate a system fingerprint using available system information
 * This creates a relatively stable identifier for the device/system
 */
export function generateSystemFingerprint(): string {
  const components: string[] = [];

  // Get hostname
  try {
    components.push(`hostname:${os.hostname()}`);
  } catch (error) {
    // Ignore
  }

  // Get platform
  components.push(`platform:${os.platform()}`);
  components.push(`arch:${os.arch()}`);

  // Get CPU info
  try {
    const cpus = os.cpus();
    if (cpus.length > 0) {
      components.push(`cpu:${cpus[0].model}`);
      components.push(`cores:${cpus.length}`);
    }
    components.push(`totalmem:${os.totalmem()}`);
  } catch (error) {
    // Ignore
  }

  // Get network interfaces (use MAC addresses for stability)
  try {
    const interfaces = os.networkInterfaces();
    const macAddresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (iface) {
        for (const addr of iface) {
          if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
            macAddresses.push(addr.mac);
            break; // Use first valid MAC per interface
          }
        }
      }
    }
    if (macAddresses.length > 0) {
      components.push(`macs:${macAddresses.sort().join(',')}`);
    }
  } catch (error) {
    // Ignore
  }

  // Get user info
  try {
    components.push(`user:${os.userInfo().username}`);
  } catch (error) {
    // Ignore
  }

  // Get app user data path (stable per installation)
  try {
    const userDataPath = app.getPath('userData');
    components.push(`userData:${userDataPath}`);
  } catch (error) {
    // Ignore
  }

  // Create a hash from all components
  const fingerprintString = components.join('|');
  
  // Use crypto hash for better uniqueness
  const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex');
  const fingerprint = `fp_${hash.substring(0, 16)}`;
  
  if (!fingerprint || fingerprint.trim() === '') {
    throw new Error('Failed to generate fingerprint: result is empty');
  }
  
  return fingerprint;
}

/**
 * Get cached system fingerprint (generates and caches on first call)
 */
let cachedFingerprint: string | null = null;

export async function getSystemFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  // Try to get from file cache first
  try {
    const userDataPath = app.getPath('userData');
    const cacheFile = path.join(userDataPath, 'system_fingerprint.txt');
    
    if (fs.existsSync(cacheFile)) {
      const stored = fs.readFileSync(cacheFile, 'utf8').trim();
      if (stored && stored.length > 0) {
        cachedFingerprint = stored;
        return stored;
      }
    }
  } catch (error) {
    console.warn('[SystemFingerprint] Failed to read from cache file:', error);
    // Continue to generate new fingerprint
  }

  // Generate new fingerprint
  try {
    const fingerprint = generateSystemFingerprint();
    
    if (!fingerprint || fingerprint.trim() === '') {
      throw new Error('Generated fingerprint is empty');
    }
    
    // Cache in file
    try {
      const userDataPath = app.getPath('userData');
      const cacheFile = path.join(userDataPath, 'system_fingerprint.txt');
      fs.writeFileSync(cacheFile, fingerprint, 'utf8');
    } catch (error) {
      console.warn('[SystemFingerprint] Failed to save to cache file:', error);
      // Continue without caching
    }
    
    cachedFingerprint = fingerprint;
    return fingerprint;
  } catch (error) {
    console.error('[SystemFingerprint] Failed to generate fingerprint:', error);
    throw error;
  }
}

