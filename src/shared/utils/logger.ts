/**
 * Centralized Logging Service
 * Provides structured logging with levels and context
 * Automatically removes logs in production builds
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorContext = errorObj
      ? {
          ...context,
          error: {
            name: errorObj.name,
            message: errorObj.message,
            stack: errorObj.stack,
          },
        }
      : context;

    this.log(LogLevel.ERROR, message, errorContext, errorObj);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // Store in history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Only log to console in development
    if (!this.isDevelopment) {
      return;
    }

    const logMessage = `[${LogLevel[level]}] ${message}`;
    const logData = context || error ? { context, error } : undefined;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, logData || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, logData || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, logData || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, logData || '');
        if (error) {
          console.error(error);
        }
        break;
    }
  }

  /**
   * Get log history (for debugging)
   */
  getHistory(): ReadonlyArray<LogEntry> {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs (for error reporting)
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

// Export convenience methods
export const { debug, info, warn, error } = logger;
