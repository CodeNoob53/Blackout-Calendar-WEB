import React, { useState, useEffect, useMemo } from 'react';
import { fetchLatestSchedule, fetchScheduleByDate, getFromCache, saveToCache, CACHE_KEYS } from './services/api';
import { ScheduleResponse, FetchStatus, QueueData } from './types';
import Timeline from './components/Timeline';
import Clock from './components/Clock';
import Header from './components/Header';
import Footer from './components/Footer';
import { formatDate, getLocalISODate, getThreeDayRange, DateOption } from './utils/timeHelper';
import { Zap, ZapOff, AlertTriangle, RefreshCw, Layers, CalendarDays, Server } from 'lucide-react';

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
  const [viewQueue, setViewQueue] = useState<string>('1.1'); // Default view queue

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
           setStatus('success'); // It's a "success" that we found nothing, visually handled by empty state
        }
      } catch (err) {
        console.error("Network error:", err);
        if (!cachedData) {
          setStatus('error');
        } else {
           // Use cached data silently, maybe show toast
           setStatus('success'); 
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
         setScheduleData(null);
      }
    } catch (err) {
      // If error, keep showing cache if available
      if (!cachedData) setScheduleData(null);
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
    <div className="min-h-screen font-sans pb-16 transition-colors duration-500
      bg-gradient-to-br from-nature-100 via-[#f1f8e9] to-white text-dark-bg selection:bg-nature-500/30
      dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-gray-900 dark:via-[#0f172a] dark:to-black dark:text-gray-100 dark:selection:bg-amber-500/30"
    >
      
      <Header 
        status={status}
        isUsingCache={isUsingCache}
        currentQueueData={currentQueueData}
        isToday={isToday}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="max-w-3xl mx-auto px-4 space-y-6">

        {/* TOP SECTION: Clock & Date Selector */}
        <section className="backdrop-blur-xl rounded-[2rem] p-2 shadow-2xl border transition-all duration-300
          bg-white/85 border-white/40 shadow-nature-900/10
          dark:bg-gray-800/40 dark:border-white/5 dark:shadow-black/50">
           <div className="grid grid-cols-4 gap-2 h-[5.5rem]">
              {/* Clock Block */}
              <Clock />

              {/* Date Buttons */}
              {dateOptions.map((opt) => {
                  const isSelected = selectedDate === opt.iso;
                  return (
                      <button
                          key={opt.iso}
                          onClick={() => handleDateChange(opt.iso)}
                          className={`flex flex-col items-center justify-center w-full h-full rounded-[1.5rem] transition-all duration-300 relative overflow-hidden border
                          ${isSelected 
                              ? 'bg-white border-nature-300 shadow-md text-nature-900 dark:bg-gray-700/80 dark:border-gray-600 dark:shadow-inner dark:text-white' 
                              : 'bg-white/70 border-transparent text-nature-800 hover:bg-white/90 dark:bg-gray-800/40 dark:text-gray-500 dark:hover:bg-gray-700/50'
                          }`}
                      >
                          <span className={`text-xs uppercase font-bold tracking-wider mb-1 transition-colors ${isSelected ? 'text-nature-800 dark:text-gray-300' : ''}`}>
                              {opt.weekday}
                          </span>
                          <span className={`text-2xl font-bold leading-none transition-colors ${isSelected ? '' : 'opacity-60'}`}>
                              {opt.day}
                          </span>
                          {/* Indicator dot for Today if not selected */}
                          {opt.isToday && !isSelected && (
                             <span className="absolute bottom-2 w-1 h-1 rounded-full bg-nature-500 dark:bg-amber-500/80 shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span>
                          )}
                      </button>
                  );
              })}
           </div>
        </section>

        {/* Queue Selector (Full Width) */}
        <section className="backdrop-blur-xl rounded-2xl p-6 shadow-xl border transition-all duration-300
          bg-white/85 border-white/40 shadow-nature-900/10
          dark:bg-gray-800/40 dark:border-white/5 dark:shadow-black/50">
            <div className="flex items-center justify-between mb-5">
                <label className="text-xs font-bold uppercase tracking-widest flex items-center transition-colors
                  text-nature-800 dark:text-gray-400">
                    <Layers className="h-4 w-4 mr-2 text-nature-600 dark:text-amber-500" /> Оберіть чергу
                </label>
                {userQueue && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full border font-semibold shadow-sm tracking-wide transition-colors
                          bg-nature-500/10 text-nature-900 border-nature-500/20
                          dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                            ВАША ЧЕРГА: {userQueue}
                        </span>
                )}
            </div>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {ALL_QUEUES.map(q => (
                <button
                key={q}
                onClick={() => handleQueueSelect(q)}
                className={`py-3 rounded-xl font-bold text-sm transition-all duration-200 border relative overflow-hidden
                ${viewQueue === q
                    ? 'bg-nature-500 text-white border-nature-400 shadow-lg shadow-nature-500/30 dark:bg-amber-500 dark:text-gray-900 dark:border-amber-400 dark:shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                    : 'bg-white/70 text-nature-800 border-gray-200 hover:border-nature-300 hover:bg-white hover:text-nature-900 dark:bg-gray-900/50 dark:text-gray-400 dark:border-white/5 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`}
                >
                  {q}
                  {viewQueue === q && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-50"></div>
                  )}
                </button>
            ))}
            </div>
        </section>

        {/* Visualization Card */}
        <section className="backdrop-blur-xl rounded-2xl p-6 shadow-2xl border relative overflow-hidden min-h-[16rem] transition-all duration-300
          bg-white/85 border-white/40 shadow-nature-900/10
          dark:bg-gray-800/40 dark:border-white/5 dark:shadow-black/50">
          
          {/* Decorative glow */}
          <div className="absolute bottom-0 left-0 w-full h-1 opacity-50 bg-gradient-to-r from-transparent to-transparent
            via-nature-500/50 dark:via-amber-500/50"></div>

          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold flex items-center gap-2 transition-colors text-gray-900 dark:text-white">
               Графік <span className="text-gray-400 dark:text-gray-600">/</span> 
               <span className="text-2xl text-nature-700 dark:text-amber-500">{viewQueue}</span>
             </h2>
             <span className="text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center transition-colors
               bg-white text-nature-800 border-nature-100
               dark:text-gray-400 dark:bg-gray-900/50 dark:border-white/5">
                <CalendarDays className="w-3 h-3 mr-1.5 opacity-70" />
                {selectedDate ? formatDate(selectedDate) : '...'}
             </span>
          </div>
          
          {isWakingUp && !isUsingCache ? (
            <div className="h-48 flex flex-col items-center justify-center text-center px-6 animate-pulse">
               <Server className="h-10 w-10 text-nature-500 dark:text-amber-500 mb-4" />
               <h3 className="text-lg font-bold text-gray-700 dark:text-white mb-2">Сервер прокидається...</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                 Оскільки це безкоштовний хостинг, перший запуск може зайняти до хвилини. Зачекайте, будь ласка.
               </p>
            </div>
          ) : status === 'loading' && !isUsingCache ? (
             <div className="h-48 flex items-center justify-center text-gray-500">
               <RefreshCw className="h-8 w-8 animate-spin mb-2 opacity-50" />
             </div>
          ) : status === 'error' && !isUsingCache ? (
            <div className="h-48 flex flex-col items-center justify-center rounded-xl border
              bg-red-50 text-red-600 border-red-100
              dark:text-red-400 dark:bg-red-500/5 dark:border-red-500/10">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-80" />
              <p className="text-sm font-medium">Помилка завантаження</p>
            </div>
          ) : !scheduleData || !currentQueueData ? (
             <div className="h-48 flex flex-col items-center justify-center rounded-xl border border-dashed mt-4 transition-colors
               bg-gray-5 text-gray-500 border-gray-200
               dark:text-gray-500 dark:bg-gray-900/20 dark:border-white/5">
                <div className="p-4 rounded-full mb-3 ring-1 transition-colors
                  bg-white ring-gray-100
                  dark:bg-gray-800/50 dark:ring-white/5">
                   <Zap className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="font-medium text-gray-600 dark:text-gray-400">Даних про відключення немає</p>
                <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Можливо, світло не вимикатимуть</p>
             </div>
          ) : (
            <>
              {/* Text Summary Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {currentQueueData.intervals.length > 0 ? (
                  currentQueueData.intervals.map((interval, idx) => (
                    <div key={idx} className="flex items-center justify-center p-3 rounded-2xl border shadow-sm transition-all
                      bg-white border-nature-200 text-nature-900 shadow-nature-500/10
                      dark:bg-gray-800/80 dark:border-white/5 dark:text-gray-100 dark:shadow-black/20">
                      <ZapOff className="w-4 h-4 mr-2 text-nature-600 dark:text-amber-500/80" />
                      <span className="font-mono text-sm font-bold tracking-tight">
                        {interval.start} — {interval.end}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center p-5 rounded-xl border shadow-sm
                    bg-nature-50 text-nature-800 border-nature-200
                    dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/10">
                     <Zap className="h-5 w-5 mr-3 fill-current" />
                     <span className="font-medium">На цей день відключень не планується!</span>
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