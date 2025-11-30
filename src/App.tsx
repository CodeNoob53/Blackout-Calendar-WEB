import React, { useState, useEffect, useMemo } from 'react';
import { fetchLatestSchedule, fetchScheduleByDate, getFromCache, saveToCache, CACHE_KEYS } from './services/api';
import { ScheduleResponse, FetchStatus, QueueData } from './types/index';
import Timeline from './components/schedule/Timeline';
import Clock from './components/ui/Clock';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { formatDate, getLocalISODate, getThreeDayRange, DateOption } from './utils/timeHelper';
import { Zap, ZapOff, AlertTriangle, RefreshCw, Layers, CalendarDays, Server, Clock as ClockIcon } from 'lucide-react';


// Common queue identifiers (Expanded to 12 queues as requested)
const ALL_QUEUES = [
  '1.1', '1.2',
  '2.1', '2.2',
  '3.1', '3.2',
  '4.1', '4.2',
  '5.1', '5.2',
  '6.1', '6.2'
];

const App: React.FC = () => {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  // Selection State
  const [dateOptions] = useState<DateOption[]>(getThreeDayRange());
  // Default to today (index 1 in the 3-day array [yesterday, today, tomorrow])
  const [selectedDate, setSelectedDate] = useState<string>(getThreeDayRange()[1].iso);

  // 1) Persistence check: userQueue is loaded from localStorage
  const [userQueue, setUserQueue] = useState<string | null>(() => localStorage.getItem('userQueue'));

  // Initialize viewQueue with the saved userQueue immediately to prevent flashing '1.1' on reload
  const [viewQueue, setViewQueue] = useState<string>(() => localStorage.getItem('userQueue') || '1.1');

  // 5) Persistence check: theme is loaded from localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setStatus('loading');

      // 2) Persistence check: Cached schedule is loaded from localStorage
      const cachedKey = `${CACHE_KEYS.SCHEDULE_PREFIX}${selectedDate}`;
      const cachedData = getFromCache<ScheduleResponse>(cachedKey);

      if (cachedData) {
        setScheduleData(cachedData);
        setIsUsingCache(true);
        // We still want to fetch fresh data, but UI is already usable
      }

      // 2. Start background fetch
      // If no cache, we might need to show a "Waking up" message if it takes too long
      let wakeUpTimer: ReturnType<typeof setTimeout> | null = null;

      if (!cachedData) {
        wakeUpTimer = setTimeout(() => {
          setIsWakingUp(true);
        }, 2000); // If requests takes > 2s, assume server is sleeping
      }

      try {
        // Fetch specific date
        let data = await fetchScheduleByDate(selectedDate).catch(() => null);

        // Fallback to latest if specific date not found (and it is today)
        if (!data && selectedDate === getLocalISODate()) {
          const latest = await fetchLatestSchedule().catch(() => null);
          if (latest && latest.date === selectedDate) {
            data = latest;
          }
        }

        if (data) {
          setScheduleData(data);
          setStatus('success');
          setIsUsingCache(false);
          saveToCache(cachedKey, data);
        } else if (!cachedData) {
          // Only set error if we don't have cached data
          setScheduleData(null);
          setIsUsingCache(false); // Server responded (with 404), so we are not offline
          setStatus('success'); // It's a "success" that we found nothing, visually handled by empty state
        } else {
          // We have cache, but server returned 404.
          if (data === null) {
            // Server said 404 explicitly
            setIsUsingCache(false);
            setStatus('success');
          }
        }
      } catch (err) {
        console.error("Network error:", err);
        if (!cachedData) {
          setStatus('error');
        } else {
          // Use cached data silently, maybe show toast
          setStatus('success');
          // Keep isUsingCache = true
        }
      } finally {
        if (wakeUpTimer) clearTimeout(wakeUpTimer);
        setIsWakingUp(false);
      }
    };
    init();
  }, []);

  // Sync userQueue changes to localStorage
  useEffect(() => {
    if (userQueue) {
      localStorage.setItem('userQueue', userQueue);
      setViewQueue(userQueue);
    }
  }, [userQueue]);

  // Fetch schedule when date changes
  const handleDateChange = async (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setStatus('loading');

    // Try cache first
    const cachedKey = `${CACHE_KEYS.SCHEDULE_PREFIX}${date}`;
    const cachedData = getFromCache<ScheduleResponse>(cachedKey);

    if (cachedData) {
      setScheduleData(cachedData);
      setIsUsingCache(true);
    } else {
      setScheduleData(null);
    }

    try {
      const data = await fetchScheduleByDate(date);
      if (data) {
        setScheduleData(data);
        setIsUsingCache(false);
        setStatus('success');
      } else if (!cachedData) {
        // Case: No cache, and Server returns 404 (null)
        setScheduleData(null);
        setIsUsingCache(false); // Important: Server responded, so we aren't using "cache mode" due to failure
        setStatus('success'); // Explicitly set success to stop loading spinner
      } else {
        // Case: We have cache, but Server returned 404.
        setScheduleData(null);
        setIsUsingCache(false);
        setStatus('success');
      }
    } catch (err) {
      // If error (Network fail), keep showing cache if available
      if (!cachedData) setScheduleData(null);
      // isUsingCache remains true if it was true
      setStatus('success');
    }
  };

  const handleQueueSelect = (queue: string) => {
    setUserQueue(queue);
    // viewQueue will auto-update via useEffect
  };

  // Derived data
  const currentQueueData: QueueData | undefined = useMemo(() => {
    return scheduleData?.queues.find(q => q.queue === viewQueue);
  }, [scheduleData, viewQueue]);

  const isToday = useMemo(() => {
    return selectedDate === getLocalISODate();
  }, [selectedDate]);

  return (
    <div className="app">

      <Header
        status={status}
        isUsingCache={isUsingCache}
        currentQueueData={currentQueueData}
        isToday={isToday}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="app__main">

        {/* TOP SECTION: Clock & Date Selector */}
        <section className="date-selector">
          <div className="date-selector__grid">
            {/* Clock Block */}
            <Clock />

            {/* Date Buttons */}
            {dateOptions.map((opt) => {
              const isSelected = selectedDate === opt.iso;
              return (
                <button
                  key={opt.iso}
                  onClick={() => handleDateChange(opt.iso)}
                  className={`date-selector__button ${isSelected ? 'date-selector__button--selected' : ''}`}
                >
                  <span className="date-selector__weekday">
                    {opt.weekday}
                  </span>
                  <span className="date-selector__day">
                    {opt.day}
                  </span>
                  {/* Indicator dot for Today if not selected */}
                  {opt.isToday && !isSelected && (
                    <span className="date-selector__today-indicator"></span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Queue Selector (Full Width) */}
        <section className="queue-selector">
          <div className="queue-selector__header">
            <label className="queue-selector__label">
              <Layers className="queue-selector__label-icon" /> Оберіть чергу
            </label>
            {userQueue && (
              <span className="queue-selector__badge">
                ВАША ЧЕРГА: {userQueue}
              </span>
            )}
          </div>
          <div className="queue-selector__grid">
            {ALL_QUEUES.map(q => (
              <button
                key={q}
                onClick={() => handleQueueSelect(q)}
                className={`queue-selector__button ${viewQueue === q ? 'queue-selector__button--active' : ''}`}
              >
                <span className="queue-selector__button-text">{q}</span>
                {viewQueue === q && (
                  <div className="queue-selector__button-glow"></div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Visualization Card */}
        <section className="schedule-card">

          {/* Decorative glow */}
          <div className="schedule-card__glow"></div>

          <div className="schedule-card__header">
            <h2 className="schedule-card__title">
              Графік <span className="schedule-card__title-separator">/</span>
              <span className="schedule-card__title-queue">{viewQueue}</span>
            </h2>
            <span className="schedule-card__date-badge">
              <CalendarDays className="schedule-card__date-icon" />
              {selectedDate ? formatDate(selectedDate) : '...'}
            </span>
          </div>

          {isWakingUp && !isUsingCache ? (
            <div className="empty-state empty-state--waking">
              <div className="empty-state__icon-wrapper">
                <Server className="empty-state__icon" />
              </div>
              <h3 className="empty-state__title">Сервер прокидається...</h3>
              <p className="empty-state__text">
                Оскільки це безкоштовний хостинг, перший запуск може зайняти до хвилини. Зачекайте, будь ласка.
              </p>
            </div>
          ) : status === 'loading' && !isUsingCache ? (
            <div className="empty-state empty-state--loading">
              <RefreshCw className="empty-state__icon" />
            </div>
          ) : status === 'error' && !isUsingCache ? (
            <div className="empty-state empty-state--error">
              <AlertTriangle className="empty-state__icon" />
              <p className="empty-state__title">Помилка завантаження</p>
            </div>
          ) : !scheduleData || !currentQueueData ? (
            <div className={`empty-state ${selectedDate > getLocalISODate() ? 'empty-state--future' : 'empty-state--no-data'}`}>

              {selectedDate > getLocalISODate() ? (
                // Future Date - Not Published Yet State
                <>
                  <div className="empty-state__icon-wrapper">
                    <ClockIcon className="empty-state__icon" />
                  </div>
                  <p className="empty-state__title">Графік ще не опубліковано</p>
                  <p className="empty-state__text">
                    Інформація зазвичай з'являється ввечері попереднього дня
                  </p>
                </>
              ) : (
                // Today/Past - No Outages State
                <>
                  <div className="empty-state__icon-wrapper">
                    <Zap className="empty-state__icon" />
                  </div>
                  <p className="empty-state__title">Даних про відключення немає</p>
                  <p className="empty-state__text">Можливо, світло не вимикатимуть</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Text Summary Grid */}
              <div className="intervals-grid">
                {currentQueueData.intervals.length > 0 ? (
                  currentQueueData.intervals.map((interval, idx) => (
                    <div key={idx} className="intervals-grid__item">
                      <ZapOff className="intervals-grid__item-icon" />
                      <span className="intervals-grid__item-time">
                        {interval.start} — {interval.end}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="intervals-grid__item intervals-grid__item--full">
                    <Zap className="intervals-grid__item-icon" />
                    <span>На цей день відключень не планується!</span>
                  </div>
                )}
              </div>

              {/* Graphical Timeline */}
              {currentQueueData.intervals.length > 0 && (
                <Timeline intervals={currentQueueData.intervals} isToday={isToday} />
              )}
            </>
          )}
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default App;
