const GA_ID = 'G-E11TL2D3ZW';

export function trackEvent(name, params = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, { ...params, send_to: GA_ID });
}
