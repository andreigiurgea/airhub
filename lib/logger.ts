/**
 * Production-safe logging utility
 * Only logs in development mode
 */

const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },

  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },

  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },

  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },

  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};
