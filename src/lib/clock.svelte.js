export const clock = $state({ now: new Date() });

const tick = () => (clock.now = new Date());
setInterval(tick, 60_000);
// Phones pause timers in the background, so also tick when the app is shown again.
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick());
