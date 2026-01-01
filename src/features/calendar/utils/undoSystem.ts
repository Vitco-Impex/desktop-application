/**
 * Undo System - Time-limited undo for actions
 */

export interface UndoAction {
  id: string;
  label: string;
  undo: () => void;
  timestamp: number;
}

class UndoSystem {
  private actions: UndoAction[] = [];
  private maxActions = 10;
  private expiryTime = 10000; // 10 seconds

  /**
   * Add an undo action
   */
  add(action: Omit<UndoAction, 'timestamp'>): string {
    const undoAction: UndoAction = {
      ...action,
      timestamp: Date.now(),
    };

    this.actions.unshift(undoAction);
    
    // Keep only maxActions
    if (this.actions.length > this.maxActions) {
      this.actions = this.actions.slice(0, this.maxActions);
    }

    // Auto-remove expired actions
    this.cleanup();

    // Auto-remove this action after expiry
    setTimeout(() => {
      this.remove(undoAction.id);
    }, this.expiryTime);

    return undoAction.id;
  }

  /**
   * Remove an undo action
   */
  remove(id: string): void {
    this.actions = this.actions.filter((action) => action.id !== id);
  }

  /**
   * Get the most recent undo action
   */
  getLatest(): UndoAction | null {
    this.cleanup();
    return this.actions.length > 0 ? this.actions[0] : null;
  }

  /**
   * Execute undo for the latest action
   */
  undo(): boolean {
    const latest = this.getLatest();
    if (latest) {
      latest.undo();
      this.remove(latest.id);
      return true;
    }
    return false;
  }

  /**
   * Clear all undo actions
   */
  clear(): void {
    this.actions = [];
  }

  /**
   * Remove expired actions
   */
  private cleanup(): void {
    const now = Date.now();
    this.actions = this.actions.filter(
      (action) => now - action.timestamp < this.expiryTime
    );
  }
}

export const undoSystem = new UndoSystem();

