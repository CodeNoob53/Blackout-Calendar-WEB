import axios, { AxiosError } from 'axios';
import { ScheduleResponse, DateListResponse, AddressSearchResponse, CachedScheduleData, NewSchedulesResponse, ChangedSchedulesResponse } from '../types';

// Axios instance with base config
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export { apiClient };

export const CACHE_KEYS = {
  LATEST_SCHEDULE: 'cached_schedule_latest',
  SCHEDULE_PREFIX: 'cached_schedule_',
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
    return parsed.data as T;
  } catch (e) {
    return null;
  }
};

// --- Helper: check if error is 503 ---

const is503 = (error: unknown): boolean =>
  error instanceof AxiosError && error.response?.status === 503;

// --- API Methods ---

export const fetchLatestSchedule = async (): Promise<ScheduleResponse> => {
  try {
    const { data } = await apiClient.get<ScheduleResponse>('/schedules/latest');
    return data;
  } catch (error) {
    if (is503(error)) {
      console.warn('Schedules API temporarily unavailable (latest)');
      return { success: false, date: '', queues: [], serviceUnavailable: true };
    }
    throw error;
  }
};

export const fetchScheduleByDate = async (date: string): Promise<ScheduleResponse> => {
  try {
    const { data } = await apiClient.get<ScheduleResponse>(`/schedules/${date}`);
    // Cache only when data is available
    if (data.success && data.available !== false) {
      saveToCache(`${CACHE_KEYS.SCHEDULE_PREFIX}${date}`, data);
    }
    return data;
  } catch (error) {
    if (is503(error)) {
      console.warn('Schedules API temporarily unavailable');
      return { success: false, date, queues: [], serviceUnavailable: true };
    }
    // Try to extract error message from API response body
    if (error instanceof AxiosError && error.response?.data) {
      const body = error.response.data;
      return { success: false, date, queues: [], error: body.error || body.message };
    }
    throw error;
  }
};

export const fetchAvailableDates = async (): Promise<DateListResponse> => {
  const { data } = await apiClient.get<DateListResponse>('/schedules/dates');
  return data;
};

export const searchAddress = async (query: string): Promise<AddressSearchResponse> => {
  if (query.length < 3) return { success: true, query, count: 0, addresses: [] };
  const { data } = await apiClient.get<AddressSearchResponse>('/addresses/search', {
    params: { q: query },
  });
  return data;
};

// --- Updates API ---

export const fetchNewSchedules = async (hours = 24): Promise<NewSchedulesResponse> => {
  try {
    const { data } = await apiClient.get<NewSchedulesResponse>('/updates/new', {
      params: { hours },
    });
    return data;
  } catch (error) {
    if (is503(error)) {
      console.warn('Updates API temporarily unavailable (new schedules)');
      return { success: true, count: 0, schedules: [], serviceUnavailable: true };
    }
    throw error;
  }
};

export const fetchChangedSchedules = async (hours = 24): Promise<ChangedSchedulesResponse> => {
  try {
    const { data } = await apiClient.get<ChangedSchedulesResponse>('/updates/changed', {
      params: { hours },
    });
    return data;
  } catch (error) {
    if (is503(error)) {
      console.warn('Updates API temporarily unavailable (changed schedules)');
      return { success: true, count: 0, schedules: [], serviceUnavailable: true };
    }
    throw error;
  }
};

// --- Push Notifications API ---

export const getVapidPublicKey = async (): Promise<string> => {
  const { data } = await apiClient.get<{ publicKey: string }>('/notifications/vapid-key');
  return data.publicKey;
};

export const subscribeToPushNotifications = async (
  subscription: PushSubscription,
  queue?: string | null,
  notificationTypes?: string[]
): Promise<boolean> => {
  const payload: any = subscription.toJSON();

  if (queue !== undefined && queue !== null) {
    payload.queue = queue;
  }
  if (notificationTypes !== undefined) {
    payload.notificationTypes = notificationTypes;
  }

  const { data } = await apiClient.post<{ success: boolean }>('/notifications/subscribe', payload);
  return data.success;
};

export const unsubscribeFromPushNotifications = async (endpoint: string): Promise<boolean> => {
  const { data } = await apiClient.post<{ success: boolean }>('/notifications/unsubscribe', { endpoint });
  return data.success;
};

export const updateNotificationQueue = async (
  endpoint: string,
  queue: string | null,
  notificationTypes?: string[]
): Promise<boolean> => {
  const { data } = await apiClient.post<{ success: boolean }>('/notifications/update-queue', {
    endpoint,
    queue,
    notificationTypes,
  });
  return data.success;
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/healthz', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
