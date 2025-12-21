import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchLatestSchedule, fetchScheduleByDate, getFromCache, saveToCache, checkHealth, CACHE_KEYS } from './services/api';
import { ScheduleResponse, FetchStatus, QueueData } from './types';
import Timeline from './components/schedule/Timeline';
import Clock from './components/ui/Clock';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import BackgroundEffects from './components/effects/BackgroundEffects';
import { formatDate, getLocalISODate, getThreeDayRange, DateOption } from './utils/timeHelper';
import { Zap, ZapOff, AlertTriangle, RefreshCw, Layers, CalendarDays, Server, Clock as ClockIcon } from 'lucide-react';
import { useLanguageSync } from './hooks/useLanguageSync';

const ALL_QUEUES = [
  '1.1', '1.2',
  '2.1', '2.2',
  '3.1', '3.2',
  '4.1', '4.2',
  '5.1', '5.2',
  '6.1', '6.2'
];

const App: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'ui', 'errors']);
  useLanguageSync(); // Синхронізація мови з backend

  const [status, setStatus] = useState<FetchStatus>('idle');
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [serverUnavailable, setServerUnavailable] = useState(false);

  const currentLocale = i18n.language === 'en' ? 'en-US' : 'uk-UA';

  const dateOptions = useMemo(() => getThreeDayRange(currentLocale), [currentLocale]);
  const [selectedDate, setSelectedDate] = useState<string>(getThreeDayRange(currentLocale)[1].iso);


  const [userQueue, setUserQueue] = useState<string | null>(() => localStorage.getItem('userQueue'));
  const [viewQueue, setViewQueue] = useState<string>(() => localStorage.getItem('userQueue') || '1.1');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    // Disable transitions during theme change to prevent "paint storm"
    const root = window.document.documentElement;
    root.classList.add('no-transitions');
    
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    
    // Briefly wait for the state change to apply, then re-enable transitions
    setTimeout(() => {
      root.classList.remove('no-transitions');
    }, 100);
  };

  useEffect(() => {
    const init = async () => {
      setStatus('loading');

      const cachedKey = `${CACHE_KEYS.SCHEDULE_PREFIX}${selectedDate}`;
      const cachedData = getFromCache<ScheduleResponse>(cachedKey);

      if (cachedData) {
        setScheduleData(cachedData);
        setIsUsingCache(true);
      }

      let wakeUpTimer: ReturnType<typeof setTimeout> | null = null;

      try {
        setServerUnavailable(false);
        let data = await fetchScheduleByDate(selectedDate).catch(() => null);

        if (!data && selectedDate === getLocalISODate()) {
          const latest = await fetchLatestSchedule().catch(() => null);
          if (latest && latest.date === selectedDate) {
            data = latest;
          }
        }

        if (data?.serviceUnavailable) {
          setServerUnavailable(true);
          if (!cachedData) {
            setScheduleData(null);
            setIsUsingCache(false);
            setStatus('error');
          } else {
            setStatus('success');
          }
          return;
        }

        if (data) {
          setScheduleData(data);
          setStatus('success');
          setIsUsingCache(false);
          saveToCache(cachedKey, data);
        } else if (!cachedData) {
          setScheduleData(null);
          setIsUsingCache(false);
          setStatus('success');
        } else {
          if (data === null) {
            setIsUsingCache(false);
            setStatus('success');
          }
        }
      } catch (err) {
        console.error("Network error:", err);
        if (!cachedData) {
          setStatus('error');
        } else {
          setStatus('success');
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (userQueue) {
      localStorage.setItem('userQueue', userQueue);
      setViewQueue(userQueue);
    }
  }, [userQueue]);

  const handleDateChange = async (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setStatus('loading');
    setServerUnavailable(false);

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
      if (data?.serviceUnavailable) {
        setServerUnavailable(true);
        if (!cachedData) {
          setScheduleData(null);
          setIsUsingCache(false);
          setStatus('error');
        } else {
          setStatus('success');
        }
        return;
      }
      if (data) {
        setScheduleData(data);
        setIsUsingCache(false);
        setStatus('success');
      } else if (!cachedData) {
        setScheduleData(null);
        setIsUsingCache(false);
        setStatus('success');
      } else {
        setScheduleData(null);
        setIsUsingCache(false);
        setStatus('success');
      }
    } catch (err) {
      if (!cachedData) setScheduleData(null);
      setStatus('success');
    }
  };

  const handleQueueSelect = (queue: string) => {
    setUserQueue(queue);
  };

  const currentQueueData: QueueData | undefined = useMemo(() => {
    return scheduleData?.queues.find(q => q.queue === viewQueue);
  }, [scheduleData, viewQueue]);

  const isToday = useMemo(() => {
    return selectedDate === getLocalISODate();
  }, [selectedDate]);

  return (
    <div className="app-root">
      <BackgroundEffects effect="snow" enabled={true} />


      <Header
        status={status}
        isUsingCache={isUsingCache}
        currentQueueData={currentQueueData}
        isToday={isToday}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="container">

        {/* TOP SECTION: Clock & Date Selector */}
        <section className="glass-card top-section">
          <Clock />

          {/* Date Buttons */}
          {dateOptions.map((opt) => {
            const isSelected = selectedDate === opt.iso;
            return (
              <button
                key={opt.iso}
                onClick={() => handleDateChange(opt.iso)}
                className={`date-btn ${isSelected ? 'active' : ''}`}
              >
                <span className="date-weekday">{opt.weekday}</span>
                <span className="date-day">{opt.day}</span>
                {opt.isToday && !isSelected && (
                  <span className="today-dot"></span>
                )}
              </button>
            );
          })}
        </section>

        {/* Queue Selector */}
        <section className="glass-card queue-section">
          <div className="queue-header">
            <label className="queue-label">
              <Layers size={16} /> {t('common:selectQueue')}
            </label>
            {userQueue && (
              <span className="user-queue-badge">
                {t('common:yourQueue')}: {userQueue}
              </span>
            )}
          </div>
          <div className="queue-grid">
            {ALL_QUEUES.map(q => (
              <button
                key={q}
                onClick={() => handleQueueSelect(q)}
                className={`queue-btn ${viewQueue === q ? 'active' : ''}`}
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* Visualization Card */}
        <section className="glass-card viz-card">
          <div className="viz-glow"></div>

          <div className="viz-header">
            <h2 className="viz-title">
              {t('common:schedule')} <span className="text-muted">/</span>
              <span className="queue-number">{viewQueue}</span>
            </h2>
            <span className="date-pill">
              <CalendarDays size={12} style={{ opacity: 0.7 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedDate ? formatDate(selectedDate, currentLocale) : '...'}

              </span>
            </span>
          </div>

          {status === 'loading' && !isUsingCache ? (
            <div className="state-container">
              <RefreshCw size={32} className="spin-icon opacity-50" />
            </div>
          ) : status === 'error' && !isUsingCache ? (
            <div className="state-container text-danger">
              <div className="state-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-text)' }}>
                <AlertTriangle size={32} />
              </div>
              <p className="font-medium">{serverUnavailable ? t('errors:serverUnavailable') : t('errors:loadingError')}</p>
              <p className="text-xs mt-1">
                {serverUnavailable
                  ? t('errors:serverUnavailableDesc')
                  : t('errors:loadingErrorDesc')}
              </p>
            </div>
          ) : !scheduleData || !currentQueueData ? (
            <div className="state-container">
              {selectedDate > getLocalISODate() ? (
                <>
                  <div className="state-icon-box" style={{ color: 'var(--warning-text)', background: 'var(--warning-bg)' }}>
                    <ClockIcon size={24} />
                  </div>
                  <p className="font-medium">{t('errors:scheduleNotPublished')}</p>
                  <p className="text-xs mt-1">{t('errors:scheduleNotPublishedDesc')}</p>
                </>
              ) : (
                <>
                  <div className="state-icon-box">
                    <Zap size={24} className="text-muted" />
                  </div>
                  <p className="font-medium">{t('errors:noData')}</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Text Summary Grid */}
              <div className="text-summary-grid">
                {currentQueueData.intervals.length > 0 ? (
                  currentQueueData.intervals.map((interval, idx) => (
                    <div key={idx} className="outage-chip">
                      <ZapOff size={16} style={{ marginRight: '8px', opacity: 0.8 }} />
                      <span>{interval.start} — {interval.end}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-outages-msg">
                    <Zap size={20} style={{ marginRight: '12px' }} />
                    <span>{t('ui:timeline.noOutages')}</span>
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