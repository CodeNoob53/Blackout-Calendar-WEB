export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getPercentage = (time: string): number => {
  const minutes = timeToMinutes(time);
  return (minutes / 1440) * 100;
};

export const getDurationPercentage = (start: string, end: string): number => {
  let startMin = timeToMinutes(start);
  let endMin = timeToMinutes(end);
  
  // Handle cross-day intervals if necessary (though API seems to imply daily chunks)
  if (endMin < startMin) endMin += 1440; 
  
  return ((endMin - startMin) / 1440) * 100;
};

export const getCurrentTimePercentage = (): number => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes / 1440) * 100;
};

export const formatDate = (dateStr: string, locale: string = 'uk-UA'): string => {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale, { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

export const getLocalISODate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface DateOption {
  iso: string;
  day: string;
  weekday: string;
  isToday: boolean;
}

export const getThreeDayRange = (locale: string = 'uk-UA'): DateOption[] => {
  const options: DateOption[] = [];
  const now = new Date();

  // Create dates for Yesterday, Today, Tomorrow
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    
    options.push({
      iso: getLocalISODate(d),
      day: String(d.getDate()),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
      isToday: i === 0
    });
  }
  
  return options;
};