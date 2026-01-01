/**
 * Socket.IO Service - Real-time communication
 */

import { io, Socket } from 'socket.io-client';
import { config } from '@/config';
import { authStore } from '@/store/authStore';
import { AttendanceSessionStatus } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = authStore.getState().accessToken;
    if (!token) {
      return;
    }

    // Extract base URL from API config (remove /api/v1)
    const baseURL = config.api.baseURL.replace('/api/v1', '');

    this.socket = io(baseURL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      // Handle disconnect
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
    });

    // Handle reconnect
    this.socket.on('reconnect', () => {
      const currentToken = authStore.getState().accessToken;
      if (!currentToken) {
        this.disconnect();
      }
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Reconnect with a new token (useful after token refresh)
   */
  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /**
   * Subscribe to attendance updates
   */
  onAttendanceUpdate(
    callback: (data: {
      type: string;
      data: {
        employeeId: string;
        employeeName: string;
        department?: string;
        status: AttendanceSessionStatus;
        checkInTime?: string;
        checkOutTime?: string;
        date: string;
      };
      timestamp: string;
    }) => void
  ): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('attendance:update', callback);
    this.socket.on('attendance:status', callback);
  }

  /**
   * Subscribe to dashboard refresh events
   */
  onDashboardRefresh(
    callback: (data: { type: string; date: string; timestamp: string }) => void
  ): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('attendance:dashboard:refresh', callback);
  }

  /**
   * Unsubscribe from attendance updates
   */
  offAttendanceUpdate(): void {
    if (this.socket) {
      this.socket.off('attendance:update');
      this.socket.off('attendance:status');
    }
  }

  /**
   * Unsubscribe from dashboard refresh
   */
  offDashboardRefresh(): void {
    if (this.socket) {
      this.socket.off('attendance:dashboard:refresh');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

