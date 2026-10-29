// The current time, for views that depend on it (sorting by time of day).
// Updated every minute, and right away when the app comes
// back into view, since phones pause timers in the background. Views derive
// just the parts they need (e.g. the hour), so they only update when those
// actually change.

export const clock = $state({ now: new Date() });

const tick = () => (clock.now = new Date());
setInterval(tick, 60_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick());
