/**
 * Application-wide constants and configuration
 */

export const CACHE_SETTINGS = {
  DROPZONE_TTL: 5 * 60 * 1000, // 5 minutes
  CUSTOMER_TTL: 5 * 60 * 1000, // 5 minutes
};

export const LOGBOOK_SETTINGS = {
  POLL_INTERVAL: 60000, // 1 minute
  DEPARTED_THRESHOLD: 15 * 60 * 1000, // 15 minutes
};

export const QUERY_LIMITS = {
  ANNOUNCEMENTS: 20,
  LOADS: 50,
  LOGBOOK_ENTRIES: 100,
  PRODUCTS: 100,
  NOTIFICATIONS: 50,
};

export const FLATLIST_CONFIG = {
  MAX_TO_RENDER_PER_BATCH: 10,
  UPDATE_CELLS_BATCHING_PERIOD: 50,
  INITIAL_NUM_TO_RENDER: 10,
  WINDOW_SIZE: 10,
};

export const REFRESH_INTERVALS = {
  CURRENT_TIME: 1000, // 1 second
  WEATHER: 5 * 60 * 1000, // 5 minutes
};
