import React, { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'shc_opening_splash_seen';

interface SHCSplashScreenProps {
  ready: boolean;
}

export default function SHCSplashScreen({ ready }: SHCSplashScreenProps) {
  const mountedAt = useRef(Date.now());
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible || !ready) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minimumDisplay = reducedMotion ? 120 : 1180;
    const remaining = Math.max(0, minimumDisplay - (Date.now() - mountedAt.current));
    let exitTimeout = 0;

    const beginExit = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // The splash remains safe in browsers where session storage is unavailable.
      }
      setExiting(true);
      exitTimeout = window.setTimeout(() => setVisible(false), reducedMotion ? 120 : 260);
    };

    const readyTimeout = window.setTimeout(beginExit, remaining);
    return () => {
      window.clearTimeout(readyTimeout);
      window.clearTimeout(exitTimeout);
    };
  }, [ready, visible]);

  if (!visible) return null;

  return (
    <div
      className={`shc-splash${exiting ? ' shc-splash--exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Opening Steward Health Care 247 Professionals"
    >
      <div className="shc-splash__glow" aria-hidden="true" />
      <div className="shc-splash__brand" aria-hidden="true">
        <img className="shc-splash__layer shc-splash__symbol" src="/assets/shc-logo.png" alt="" />
        <img className="shc-splash__layer shc-splash__name" src="/assets/shc-logo.png" alt="" />
        <img className="shc-splash__layer shc-splash__tagline" src="/assets/shc-logo.png" alt="" />
      </div>
      <span className="sr-only">Loading Steward Health Care 247 Professionals</span>
    </div>
  );
}
