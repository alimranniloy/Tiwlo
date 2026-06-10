import React from 'react';
import { useLocation } from 'react-router-dom';
import { fetchTrackingIntegrationsWithApi, type TrackingIntegrationsStatus } from '../lib/api/settings';

const GOOGLE_LOADER_ID = 'tiwlo-google-analytics-loader';
const GOOGLE_TAG_MANAGER_LOADER_ID = 'tiwlo-google-tag-manager-loader';
const FACEBOOK_LOADER_ID = 'tiwlo-facebook-pixel-loader';
const TRACKING_IDLE_DELAY_MS = 9000;

let activeGoogleMeasurementId = '';
let activeGoogleTagManagerId = '';
let activeFacebookPixelId = '';

const cleanPath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

function scheduleTrackingStart(callback: () => void) {
  let done = false;
  let timer: number | undefined;
  let idleId: number | undefined;
  const win = window as any;

  const run = () => {
    if (done) return;
    done = true;
    callback();
  };
  const beginWhenIdle = () => {
    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(run, { timeout: 2500 });
      return;
    }
    run();
  };
  const schedule = () => {
    timer = window.setTimeout(beginWhenIdle, TRACKING_IDLE_DELAY_MS);
  };
  const interactionEvents = ['pointerdown', 'keydown', 'touchstart'] as const;

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
  interactionEvents.forEach((eventName) => window.addEventListener(eventName, run, { once: true, passive: true }));

  return () => {
    done = true;
    window.removeEventListener('load', schedule);
    interactionEvents.forEach((eventName) => window.removeEventListener(eventName, run));
    if (timer) window.clearTimeout(timer);
    if (idleId && typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(idleId);
  };
}

function loadGoogleAnalytics(measurementId: string) {
  const id = String(measurementId || '').trim().toUpperCase();
  if (!/^G-[A-Z0-9]{4,}$/.test(id)) return false;

  const win = window as any;
  win.dataLayer = win.dataLayer || [];
  win.gtag = win.gtag || function gtag() {
    win.dataLayer.push(arguments);
  };

  if (!document.getElementById(GOOGLE_LOADER_ID)) {
    const script = document.createElement('script');
    script.id = GOOGLE_LOADER_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  if (activeGoogleMeasurementId !== id) {
    activeGoogleMeasurementId = id;
    win.gtag('js', new Date());
    win.gtag('config', id, {
      send_page_view: false
    });
  }

  return true;
}

function sendGooglePageView(path: string) {
  const win = window as any;
  if (!activeGoogleMeasurementId || typeof win.gtag !== 'function') return;
  win.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  });
}

function loadGoogleTagManager(containerId: string) {
  const id = String(containerId || '').trim().toUpperCase();
  if (!/^GTM-[A-Z0-9]{4,}$/.test(id)) return false;

  const win = window as any;
  win.dataLayer = win.dataLayer || [];

  if (activeGoogleTagManagerId !== id) {
    activeGoogleTagManagerId = id;
    win.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });
  }

  if (!document.getElementById(GOOGLE_TAG_MANAGER_LOADER_ID)) {
    const script = document.createElement('script');
    script.id = GOOGLE_TAG_MANAGER_LOADER_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  return true;
}

function loadFacebookPixel(pixelId: string) {
  const id = String(pixelId || '').trim();
  if (!/^\d{5,30}$/.test(id)) return false;

  const win = window as any;
  if (!win.fbq) {
    const fbq: any = function (...args: any[]) {
      fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    win.fbq = fbq;
    win._fbq = fbq;
  }

  if (!document.getElementById(FACEBOOK_LOADER_ID)) {
    const script = document.createElement('script');
    script.id = FACEBOOK_LOADER_ID;
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  if (activeFacebookPixelId !== id) {
    activeFacebookPixelId = id;
    win.fbq('init', id);
  }

  return true;
}

function sendFacebookPageView() {
  const win = window as any;
  if (!activeFacebookPixelId || typeof win.fbq !== 'function') return;
  win.fbq('track', 'PageView');
}

export default function TrackingScripts() {
  const location = useLocation();
  const [config, setConfig] = React.useState<TrackingIntegrationsStatus | null>(null);
  const [trackingReady, setTrackingReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const load = () => {
      fetchTrackingIntegrationsWithApi()
        .then((nextConfig) => {
          if (mounted) setConfig(nextConfig);
        })
        .catch(() => {
          if (mounted) setConfig(null);
        });
    };

    load();
    window.addEventListener('tiwlo:tracking-refresh', load);
    return () => {
      mounted = false;
      window.removeEventListener('tiwlo:tracking-refresh', load);
    };
  }, []);

  React.useEffect(() => {
    return scheduleTrackingStart(() => setTrackingReady(true));
  }, []);

  React.useEffect(() => {
    if (!config || !trackingReady) return;

    const googleReady = config.googleAnalytics?.enabled
      ? loadGoogleAnalytics(config.googleAnalytics.measurementId)
      : false;
    if (config.googleTagManager?.enabled) {
      loadGoogleTagManager(config.googleTagManager.containerId);
    }
    const facebookReady = config.facebookPixel?.enabled
      ? loadFacebookPixel(config.facebookPixel.pixelId)
      : false;
    const path = cleanPath();

    if (googleReady) sendGooglePageView(path);
    if (facebookReady) sendFacebookPageView();
  }, [config, trackingReady, location.pathname, location.search, location.hash]);

  return null;
}
