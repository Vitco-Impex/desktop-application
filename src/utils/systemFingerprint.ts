/**
 * System Fingerprint Utility
 * Generates a unique fingerprint for the system/device
 * Used to enforce one employee per device for attendance tracking
 */

/**
 * Generate a system fingerprint using available system information
 * This creates a relatively stable identifier for the device/system
 * Note: This function is synchronous but marked as async for consistency
 */
export function generateSystemFingerprint(): string {
  const components: string[] = [];

  // Get screen resolution
  if (window.screen) {
    components.push(`screen:${window.screen.width}x${window.screen.height}`);
    components.push(`avail:${window.screen.availWidth}x${window.screen.availHeight}`);
  }

  // Get timezone
  if (Intl && Intl.DateTimeFormat) {
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  }

  // Get language
  components.push(`lang:${navigator.language || 'unknown'}`);

  // Get platform
  components.push(`platform:${navigator.platform || 'unknown'}`);

  // Get hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency) {
    components.push(`cores:${navigator.hardwareConcurrency}`);
  }

  // Get device memory (if available)
  if ((navigator as any).deviceMemory) {
    components.push(`memory:${(navigator as any).deviceMemory}`);
  }

  // Try to get Canvas fingerprint (more stable)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('SystemFingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('SystemFingerprint', 4, 17);
      const canvasHash = canvas.toDataURL();
      components.push(`canvas:${canvasHash.substring(0, 50)}`);
    }
  } catch (e) {
    // Canvas fingerprinting blocked
  }

  // Create a hash from all components
  const fingerprintString = components.join('|');
  
  // Simple hash function (or use a proper crypto library)
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const fingerprint = `fp_${Math.abs(hash).toString(36)}_${fingerprintString.length}`;
  
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

  // Try to get from localStorage first
  try {
    const stored = localStorage.getItem('system_fingerprint');
    if (stored && stored.trim() !== '') {
      cachedFingerprint = stored;
      return stored;
    }
  } catch (error) {
    console.warn('[SystemFingerprint] Failed to read from localStorage:', error);
    // Continue to generate new fingerprint
  }

  // Generate new fingerprint
  try {
    const fingerprint = generateSystemFingerprint();
    
    if (!fingerprint || fingerprint.trim() === '') {
      throw new Error('Generated fingerprint is empty');
    }
    
    // Cache in localStorage
    try {
      localStorage.setItem('system_fingerprint', fingerprint);
    } catch (error) {
      console.warn('[SystemFingerprint] Failed to save to localStorage:', error);
      // Continue without caching
    }
    
    cachedFingerprint = fingerprint;
    return fingerprint;
  } catch (error) {
    console.error('[SystemFingerprint] Failed to generate fingerprint:', error);
    throw error;
  }
}

