/**
 * Auto Attendance System Types
 */

export type AutoCheckInTrigger = 'app_start' | 'login' | 'network_change' | 'system_wake';

export interface AutoCheckInResult {
  success: boolean;
  trigger: AutoCheckInTrigger;
  reason?: string;
  attendanceId?: string;
  timestamp: Date;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  alreadyCheckedIn?: boolean;
  shiftAssigned?: boolean;
  isWorkingDay?: boolean;
  withinTimeWindow?: boolean;
  autoCheckInEnabled?: boolean;
  networkValid?: boolean;
}

export interface SessionState {
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface AutoAttendanceConfig {
  autoCheckInEnabled: boolean;
  autoStartEnabled: boolean;
  showNotifications: boolean;
}

export interface AutoAttendanceStorage {
  lastCheckInAttemptTimestamp?: string;
  lastCheckInSessionId?: string;
  lastNetworkUsed?: {
    type: 'wifi' | 'ethernet';
    ssid?: string;
    bssid?: string;
    macAddress?: string;
  };
  lastTriggerAttempts?: Record<AutoCheckInTrigger, string>; // timestamp per trigger
}

