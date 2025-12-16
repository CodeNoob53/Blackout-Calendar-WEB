/**
 * Frontend Logger with log levels
 * Similar to Winston but lightweight for browser
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor() {
    // По замовчуванню: в production тільки warnings і errors, в dev - все
    const isProduction = import.meta.env.PROD;
    this.config = {
      level: isProduction ? 'warn' : 'debug',
      enabled: true,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  // Для розробки: можна тимчасово змінити рівень логування
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // Для розробки: можна тимчасово вимкнути логування
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

// Експортуємо singleton
export const logger = new Logger();

// Для зручності: можна викликати window.setLogLevel('debug') в консолі для дебагу
if (typeof window !== 'undefined') {
  (window as any).setLogLevel = (level: LogLevel) => {
    logger.setLevel(level);
    console.log(`Log level changed to: ${level}`);
  };
}
