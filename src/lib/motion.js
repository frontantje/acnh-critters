/** Whether the device asks for reduced motion; effects are skipped then. */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
