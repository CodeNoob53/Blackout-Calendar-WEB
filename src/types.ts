export interface Interval {
  start: string;
  end: string;
}

export interface QueueData {
  queue: string;
  intervals: Interval[];
}

export interface ScheduleResponse {
  success: boolean;
  date: string;
  queues: QueueData[];
  available?: boolean;
  message?: string;
  error?: string;
  serviceUnavailable?: boolean;
}

export interface DateListResponse {
  success: boolean;
  dates: string[];
}

export interface Address {
  id: number;
  full_address: string;
  queue: string;
}

export interface AddressSearchResponse {
  success: boolean;
  query: string;
  count: number;
  addresses: Address[];
}

export interface AddressExactResponse {
  success: boolean;
  address: Address;
  error?: string;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// Caching Types
export interface CachedScheduleData {
  data: ScheduleResponse;
  timestamp: number;
}

// Notification Types
export interface NotificationSettings {
  lightAlerts: boolean;     // Alert 30 mins before turn off/on
  nightMode: boolean;       // No alerts 22:00 - 08:00
  scheduleUpdates: boolean; // Alert when schedule changes
  tomorrowSchedule: boolean;// Alert when tomorrow's schedule is available
  silentMode: boolean;      // No system notifications, only in-app (when browser open)
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: number; // timestamp in milliseconds
  read: boolean;
  type: 'info' | 'warning' | 'success';
  timestamp?: string; // ISO timestamp from IndexedDB (optional for backward compatibility)
}

// Update API Types
export interface NewScheduleItem {
  date: string;
  publishedAt: string;
  messageDate: string;
  sourcePostId: string;
  pushMessage: string;
}

export interface NewSchedulesResponse {
  success: boolean;
  count: number;
  schedules: NewScheduleItem[];
  serviceUnavailable?: boolean;
}

export interface ChangedScheduleItem {
  date: string;
  updatedAt: string;
  messageDate: string;
  sourcePostId: string;
  updateCount: number;
  pushMessage: string;
}

export interface ChangedSchedulesResponse {
  success: boolean;
  count: number;
  schedules: ChangedScheduleItem[];
  serviceUnavailable?: boolean;
}