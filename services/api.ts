import { ScheduleResponse, DateListResponse, AddressSearchResponse, CachedScheduleData, NewSchedulesResponse, ChangedSchedulesResponse } from '../types';

const BASE_URL = 'https://blackout-calendar.onrender.com/api';

export const CACHE_KEYS = {
  LATEST_SCHEDULE: 'cached_schedule_latest',
  SCHEDULE_PREFIX: 'cached_schedule_',
};

// Helper to handle slow server wake-ups (Render free tier)
const fetchWithTimeout = async (url: string, timeout = 15000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
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