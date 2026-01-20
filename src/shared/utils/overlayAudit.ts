/**
 * Overlay Audit Utility
 * Scans DOM for potential invisible blockers that might prevent mouse clicks.
 */

const DEBUG_FOCUS = import.meta.env.DEBUG_FOCUS === '1' || import.meta.env.VITE_DEBUG_FOCUS === '1';

interface OverlayBlocker {
  element: HTMLElement;
  reason: string;
  styles: {
    position: string;
    pointerEvents: string;
    display: string;
    visibility: string;
    opacity: string;
    zIndex: string;
  };
}

const logFocus = (...args: any[]) => {
  if (DEBUG_FOCUS) {
    console.log('[OverlayAudit]', ...args);
  }
};

/**
 * Check if an element covers the full viewport
 */
function isFullViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Check if element covers at least 90% of viewport (allowing for small margins)
  const coverageThreshold = 0.9;
  const coversWidth = rect.width >= viewportWidth * coverageThreshold;
  const coversHeight = rect.height >= viewportHeight * coverageThreshold;
  
  return coversWidth && coversHeight;
}

/**
 * Audit DOM for potential invisible blockers
 */
export function auditOverlays(): OverlayBlocker[] {
  const blockers: OverlayBlocker[] = [];
  
  // Find all elements with position: fixed
  const fixedElements = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.position === 'fixed';
  });
  
  for (const element of fixedElements) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Check if it covers full viewport
    if (isFullViewport(element)) {
      const pointerEvents = style.pointerEvents;
      const display = style.display;
      const visibility = style.visibility;
      const opacity = parseFloat(style.opacity);
      const zIndex = style.zIndex;
      
      // Potential blocker if:
      // 1. Has pointer-events: auto (or not none)
      // 2. Is visible (display !== none, visibility !== hidden, opacity > 0)
      // 3. Has high z-index (likely an overlay)
      const isVisible = display !== 'none' && visibility !== 'hidden' && opacity > 0.1;
      const canBlock = pointerEvents !== 'none' && isVisible;
      
      if (canBlock) {
        const reason = `Fixed position full-viewport element with pointer-events: ${pointerEvents}, z-index: ${zIndex}`;
        blockers.push({
          element,
          reason,
          styles: {
            position: style.position,
            pointerEvents,
            display,
            visibility,
            opacity: style.opacity,
            zIndex,
          },
        });
        
        logFocus('Potential blocker found', {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          reason,
          styles: {
            position: style.position,
            pointerEvents,
            display,
            visibility,
            opacity: style.opacity,
            zIndex,
          },
        });
      }
    }
  }
  
  return blockers;
}

/**
 * Check for hidden overlays that might still be blocking
 */
export function checkHiddenOverlays(): OverlayBlocker[] {
  const blockers: OverlayBlocker[] = [];
  
  // Check common overlay classes
  const overlaySelectors = [
    '.modal-overlay',
    '.side-drawer-overlay',
    '.batch-serial-editor-overlay',
    '[data-overlay]',
  ];
  
  for (const selector of overlaySelectors) {
    const overlays = document.querySelectorAll<HTMLElement>(selector);
    
    for (const overlay of overlays) {
      const style = window.getComputedStyle(overlay);
      const hasAriaHidden = overlay.getAttribute('aria-hidden') === 'true';
      const hasHiddenAttr = overlay.hasAttribute('hidden');
      const display = style.display;
      const visibility = style.visibility;
      const pointerEvents = style.pointerEvents;
      
      // If overlay is hidden but still has pointer-events: auto, it's a blocker
      if ((hasAriaHidden || hasHiddenAttr || display === 'none' || visibility === 'hidden') && 
          pointerEvents !== 'none') {
        blockers.push({
          element: overlay,
          reason: `Hidden overlay with pointer-events: ${pointerEvents}`,
          styles: {
            position: style.position,
            pointerEvents,
            display,
            visibility,
            opacity: style.opacity,
            zIndex: style.zIndex,
          },
        });
        
        logFocus('Hidden overlay blocking pointer events', {
          selector,
          className: overlay.className,
          id: overlay.id,
          pointerEvents,
        });
      }
    }
  }
  
  return blockers;
}

/**
 * Run full audit and log results
 */
export function runOverlayAudit(): OverlayBlocker[] {
  const fixedBlockers = auditOverlays();
  const hiddenBlockers = checkHiddenOverlays();
  const allBlockers = [...fixedBlockers, ...hiddenBlockers];
  
  if (allBlockers.length > 0) {
    logFocus(`Found ${allBlockers.length} potential overlay blockers`);
  }
  
  return allBlockers;
}
