import { ScheduleResponse, DateListResponse, AddressSearchResponse, CachedScheduleData, NewSchedulesResponse, ChangedSchedulesResponse } from '../types';

const BASE_URL = 'https://blackout-calendar.onrender.com/api';

export const CACHE_KEYS = {
  LATEST_SCHEDULE: 'cached_schedule_latest',
  SCHEDULE_PREFIX: 'cached_schedule_',
};

// Helper to handle slow server wake-ups (Render free tier)
const fetchWithTimeout = async (url: string, timeout = 15000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => {
    // Providing a reason is crucial to prevent "signal is aborted without reason" error
    controller.abort(new Error('Request timed out'));
  }, timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    // Handle AbortError specifically or check if signal was aborted with our reason
    if (error.name === 'AbortError' || (controller.signal.aborted && controller.signal.reason?.message === 'Request timed out')) {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
};

// --- Caching Utilities ---

export const saveToCache = (key: string, data: any) => {
  try {
    const cacheData: CachedScheduleData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to save to cache', e);
  }
};

export const getFromCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed: CachedScheduleData = JSON.parse(cached);
    // Optional: Add expiration logic here (e.g., 24 hours)
    // if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) return null;
    return parsed.data as T;
  } catch (e) {
    return null;
  }
};

// --- API Methods ---

export const fetchLatestSchedule = async (): Promise<ScheduleResponse> => {
  const response = await fetchWithTimeout(`${BASE_URL}/schedules/latest`);
  if (!response.ok) throw new Error('Failed to fetch latest schedule');
  return response.json();
};

export const fetchScheduleByDate = async (date: string): Promise<ScheduleResponse | null> => {
  // Try cache first for specific dates (optional, but good for UX)
  // const cached = getFromCache<ScheduleResponse>(`${CACHE_KEYS.SCHEDULE_PREFIX}${date}`);
  // if (cached) return cached;

  const response = await fetchWithTimeout(`${BASE_URL}/schedules/${date}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch schedule for ${date}`);
  
  const data = await response.json();
  // Cache successful responses
  if (data.success) {
    saveToCache(`${CACHE_KEYS.SCHEDULE_PREFIX}${date}`, data);
  }
  return data;
};

export const fetchAvailableDates = async (): Promise<DateListResponse> => {
  const response = await fetchWithTimeout(`${BASE_URL}/schedules/dates`);
  if (!response.ok) throw new Error('Failed to fetch dates');
  return response.json();
};

export const searchAddress = async (query: string): Promise<AddressSearchResponse> => {
  if (query.length < 3) return { success: true, query, count: 0, addresses: [] };
  const response = await fetchWithTimeout(`${BASE_URL}/addresses/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search address');
  return response.json();
};

// --- Updates API ---

export const fetchNewSchedules = async (hours = 24): Promise<NewSchedulesResponse> => {
  const response = await fetchWithTimeout(`${BASE_URL}/updates/new?hours=${hours}`);
  if (!response.ok) throw new Error('Failed to fetch new schedules');
  return response.json();
};

export const fetchChangedSchedules = async (hours = 24): Promise<ChangedSchedulesResponse> => {
  const response = await fetchWithTimeout(`${BASE_URL}/updates/changed?hours=${hours}`);
  if (!response.ok) throw new Error('Failed to fetch changed schedules');
  return response.json();
};

// --- Push Notifications API ---

export const getVapidPublicKey = async (): Promise<string> => {
  const response = await fetchWithTimeout(`${BASE_URL}/notifications/vapid-key`);
  if (!response.ok) throw new Error('Failed to fetch VAPID key');
  const data = await response.json();
  return data.publicKey;
};

export const subscribeToPushNotifications = async (subscription: PushSubscription): Promise<boolean> => {
  const response = await fetch(`${BASE_URL}/notifications/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON())
  });

  if (!response.ok) throw new Error('Failed to subscribe to push notifications');
  const data = await response.json();
  return data.success;
};

export const unsubscribeFromPushNotifications = async (endpoint: string): Promise<boolean> => {
  const response = await fetch(`${BASE_URL}/notifications/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint })
  });

  if (!response.ok) throw new Error('Failed to unsubscribe from push notifications');
  const data = await response.json();
  return data.success;
};

export const updateNotificationQueue = async (
  endpoint: string,
  queue: string | null,
  notificationTypes?: string[]
): Promise<boolean> => {
  const response = await fetch(`${BASE_URL}/notifications/update-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, queue, notificationTypes })
  });

  if (!response.ok) throw new Error('Failed to update notification queue');
  const data = await response.json();
  return data.success;
};