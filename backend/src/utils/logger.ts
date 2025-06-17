/**
 * Centralized logging utility for consistent logging across the application
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogMessage {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
}

/**
 * Logger class for consistent logging across the application
 */
class Logger {
  private serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Format and output a log message
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const logMessage: LogMessage = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      data: data || undefined
    };
    
    // Output to console in a standardized format
    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(logMessage));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logMessage));
        break;
      default:
        console.log(JSON.stringify(logMessage));
    }
  }
  
  /**
   * Log debug information
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log general information
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log warnings
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log errors
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Log HTTP request details
   */
  request(method: string, url: string, headers?: Record<string, string>): void {
    this.info(`HTTP ${method} ${url}`, { headers });
  }
}

/**
 * Create a logger for a specific service
 * @param serviceName Name of the service for identifying log source
 */
export const createLogger = (serviceName: string): Logger => {
  return new Logger(serviceName);
};

// Create default logger for general use
export const logger = createLogger('app');

// Export interfaces for reuse
export { LogLevel, LogMessage };
