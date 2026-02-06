import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const Clock: React.FC = () => {
  const { t } = useTranslation('ui');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  const datetime = `${hours}:${minutes}`;

  return (
    <div className="clock-container" role="timer" aria-label={t('clock.now')} aria-atomic="true">
      <span className="clock-label">
        {t('clock.now')}
      </span>
      <time className="clock-time" dateTime={datetime}>
        <span>{hours}</span>
        <span className="blink-colon" aria-hidden="true">:</span>
        <span>{minutes}</span>
      </time>
    </div>
  );
};

export default Clock;