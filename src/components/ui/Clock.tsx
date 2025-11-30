import React, { useState, useEffect } from 'react';
import '../../styles/components/clock.css';

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div className="clock">
      <span className="clock__label">
        Зараз
      </span>
      <div className="clock__time">
        <span>{hours}</span>
        <span className="clock__separator">:</span>
        <span>{minutes}</span>
      </div>
    </div>
  );
};

export default Clock;