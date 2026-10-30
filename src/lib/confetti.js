import { prefersReducedMotion } from './motion.js';

const COLORS = ['#16a34a', '#4ade80', '#facc15', '#fb923c', '#38bdf8', '#f472b6'];
const PIECES = 18;
const DURATION = 900;

/** @param {Element} element */
export function confettiFrom(element) {
  if (prefersReducedMotion()) return;

  const box = element.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;

  // A layer over the whole page, so the burst survives the row disappearing.
  const layer = document.createElement('div');
  layer.dataset.confetti = '';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:50';
  document.body.append(layer);

  const animations = Array.from({ length: PIECES }, (_, i) => {
    const width = 5 + Math.random() * 4;
    const piece = document.createElement('span');
    piece.style.cssText =
      `position:absolute;left:${x - width / 2}px;top:${y - width / 2}px;` +
      `width:${width}px;height:${width * 0.6}px;border-radius:1px;background:${COLORS[i % COLORS.length]}`;
    layer.append(piece);

    const angle = ((-90 + (Math.random() - 0.5) * 140) * Math.PI) / 180;
    const distance = 45 + Math.random() * 45;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const spin = (Math.random() - 0.5) * 720;
    return piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.2}px, ${dy + 45}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: DURATION * (0.8 + Math.random() * 0.4), easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
    );
  });
  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => layer.remove());
}
