/**
 * For modals: a held Enter that opened one keeps repeating on its first button, which would close it right away.
 * @param {KeyboardEvent} event
 */
export function ignoreHeldEnter(event) {
  if (event.repeat && event.key === 'Enter') event.preventDefault();
}
