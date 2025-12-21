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

  return (
    <div className="clock-container">
      <span className="clock-label">
        {t('clock.now')}
      </span>
      <div className="clock-time">
        <span>{hours}</span>
        <span className="blink-colon">:</span>
        <span>{minutes}</span>
      </div>
    </div>
  );
};

export default Clock;