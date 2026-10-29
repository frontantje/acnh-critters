<script>
  import { tick } from 'svelte';
  import { CATEGORIES, critterName, critters } from './critters.js';
  import { t } from './i18n.svelte.js';
  import { prefersReducedMotion } from './motion.js';
  import { markCaught, markSynced, progress } from './progress.svelte.js';

  /** @typedef {import('./critters.js').Critter} Critter */

  /** @type {{ onexit: () => void }} */
  let { onexit } = $props();

  // A full-screen modal dialog: Escape exits, and focus stays inside it.
  /** @type {HTMLDialogElement} */
  let dialog;
  $effect(() => dialog.showModal());

  /** @type {Record<string, string>} */
  const CATEGORY_ICONS = { fish: 'sea-bass', bug: 'common-butterfly', sea: 'octopus' };
  /** @param {string} category */
  const categoryIcon = (category) => critters.find((critter) => critter.id === CATEGORY_ICONS[category])?.icon;
  /** @param {string} category */
  const categoryLabel = (category) => t(CATEGORIES.find((c) => c.id === category)?.label ?? 'tabAll');

  /** The category being synced, or null while choosing one. */
  let category = $state(/** @type {string | null} */ (null));
  /** The category's uncaught critters when its sync started, in Critterpedia order. */
  let queue = $state.raw(/** @type {Critter[]} */ ([]));
  let index = $state(0);
  const current = $derived(queue[index]);

  // Preload the next icon so it shows without a delay.
  $effect(() => {
    const next = queue[index + 1];
    if (next) new Image().src = next.icon;
  });

  /** @param {string} id */
  function counts(id) {
    const all = critters.filter((critter) => critter.type === id);
    return { total: all.length, caught: all.filter((critter) => progress.caught.has(critter.id)).length };
  }

  // The clicked button disappears when switching between the category list and
  // the critter steps, so focus is moved on explicitly (it would otherwise fall
  // back to the page body, outside the dialog).
  /** @param {string} selector */
  async function focusAfterRender(selector) {
    await tick();
    /** @type {HTMLElement | null} */ (dialog.querySelector(selector))?.focus();
  }

  /** @param {string} id */
  function start(id) {
    const uncaught = critters.filter((critter) => critter.type === id && !progress.caught.has(critter.id));
    if (uncaught.length === 0) {
      markSynced(id);
      return;
    }
    queue = uncaught;
    index = 0;
    category = id;
    focusAfterRender('[data-action="caught"]');
  }

  // Feedback on the critter before moving on: a happy pulse with a green glow
  // for Caught, a little shake for Next.
  const PULSE = [
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgb(22 163 74 / 0))' },
    { transform: 'scale(1.12)', filter: 'drop-shadow(0 0 14px rgb(22 163 74 / 0.6))', offset: 0.45 },
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgb(22 163 74 / 0))' },
  ];
  const SHAKE = [0, -10, 9, -6, 4, 0].map((x) => ({ transform: `translateX(${x}px)` }));

  /** The shown critter's element (icon and name); a new one for every critter. */
  let card = $state(/** @type {HTMLElement | undefined} */ (undefined));
  let busy = false;

  /**
   * Moves on, marking the critter first if it was caught. Unless the device asks
   * for reduced motion, the critter pulses (caught) or shakes (next; not after a
   * swipe, which already moved it), slides out to the left, and the next one
   * slides in. Input during that is ignored, so a quick double tap can't mark a
   * critter that hasn't been shown yet.
   * @param {boolean} caught
   * @param {number} [swipedTo] how far the critter was dragged when a swipe ended
   */
  async function advance(caught, swipedTo) {
    if (busy) return;
    if (caught) markCaught(current.id);
    if (card && !prefersReducedMotion()) {
      busy = true;
      try {
        if (swipedTo === undefined) {
          await card.animate(caught ? PULSE : SHAKE, { duration: caught ? 320 : 280, easing: 'ease-out' }).finished;
        }
        // Further left from wherever the critter is (after a swipe, the finger's spot).
        const from = swipedTo ?? 0;
        await card.animate(
          [
            { transform: `translateX(${from}px)`, opacity: 1 + from / 400 },
            { transform: `translateX(${from - 160}px)`, opacity: 0 },
          ],
          { duration: 160, easing: 'ease-in', fill: 'forwards' },
        ).finished;
      } catch {
        // The animation was cancelled; just move on.
      } finally {
        busy = false;
      }
    }
    showNext();
  }

  function showNext() {
    if (index + 1 < queue.length) {
      index += 1;
      slideIn();
    } else {
      const finished = /** @type {string} */ (category);
      markSynced(finished);
      category = null;
      focusAfterRender(`[data-category="${finished}"]`);
    }
  }

  // Doesn't block input: the next critter can be marked while it slides in.
  async function slideIn() {
    if (prefersReducedMotion()) return;
    await tick();
    card?.animate(
      [
        { transform: 'translateX(48px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 180, easing: 'ease-out' },
    );
  }

  // Keyboard shortcuts on the critter steps, wherever focus is: → means Next,
  // Enter means Caught. On a focused button Enter keeps clicking that button
  // (e.g. Next or ✕), as screen reader users expect. Held-down repeats are
  // ignored so a long press can't skip or catch a whole run of critters.
  /** @param {KeyboardEvent} event */
  function onkeydown(event) {
    if (category === null || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!event.repeat) advance(false);
    } else if (event.key === 'Enter') {
      if (event.repeat) {
        event.preventDefault();
      } else if (!(event.target instanceof Element && event.target.closest('button'))) {
        event.preventDefault();
        advance(true);
      }
    }
  }

  // Clicking or tapping Next leaves focus on it, so the next Enter would skip
  // instead of catch; move it back to Caught. Keyboard presses (detail 0) keep
  // focus on Next so repeated Space presses keep skipping.
  /** @param {MouseEvent} event */
  function onNextClick(event) {
    advance(false);
    if (event.detail > 0 && category !== null) focusAfterRender('[data-action="caught"]');
  }

  // Swiping left on the critter also means Next. The critter follows the
  // finger and springs back if the swipe is too short.
  const SWIPE_DISTANCE = 60;
  /** @type {{ x: number, y: number, pointerId: number } | null} */
  let swipe = null;
  let dragX = $state(0);
  let dragging = $state(false);

  /** @param {PointerEvent} event */
  function onSwipeStart(event) {
    if (event.pointerType === 'mouse') return;
    swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    dragging = true;
  }

  /** @param {PointerEvent} event */
  function onSwipeMove(event) {
    if (swipe?.pointerId !== event.pointerId) return;
    dragX = Math.min(0, event.clientX - swipe.x);
  }

  /** @param {PointerEvent} event */
  function onSwipeEnd(event) {
    if (swipe?.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    const draggedTo = dragX;
    cancelSwipe();
    if (event.type === 'pointerup' && dx < -SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) advance(false, draggedTo);
  }

  function cancelSwipe() {
    swipe = null;
    dragX = 0;
    dragging = false;
  }
</script>

<svelte:window {onkeydown} />

<dialog
  bind:this={dialog}
  onclose={onexit}
  aria-labelledby="sync-title"
  class="m-0 size-full max-h-none max-w-none overscroll-contain bg-amber-50 p-0 text-stone-800"
>
  <div class="mx-auto flex min-h-full max-w-md flex-col px-4 pb-6">
    <header class="flex items-center justify-between gap-4 pt-2 pb-4">
      <h2 id="sync-title" class="text-xl font-bold">{t('syncTitle')}</h2>
      <button
        class="grid size-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-200/70"
        aria-label={t('syncExit')}
        onclick={() => dialog.close()}
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    {#if category === null}
      <p class="text-stone-600">{t('syncIntro')}</p>

      <ul class="mt-6 grid gap-3">
        {#each CATEGORIES as { id, label } (id)}
          {@const count = counts(id)}
          <li>
            <button
              class="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-green-50"
              data-category={id}
              onclick={() => start(id)}
            >
              <img class="size-12 object-contain" src={categoryIcon(id)} alt="" width="48" height="48" />
              <span class="flex-1">
                <span class="block text-lg font-bold">{t(label)}</span>
                <span class="text-sm text-stone-500">
                  {t('syncCount', { caught: String(count.caught), total: String(count.total) })}
                </span>
              </span>
              {#if progress.synced.has(id)}
                <span class="grid size-8 shrink-0 place-items-center rounded-full bg-green-600 font-bold text-white">
                  <span aria-hidden="true">✓</span>
                  <span class="sr-only">{t('syncCompleted')}</span>
                </span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>

      <button
        class="mt-8 rounded-full border-2 border-green-600 px-5 py-3 font-bold text-green-700 hover:bg-green-100"
        onclick={() => dialog.close()}
      >
        {t('syncDone')}
      </button>
    {:else}
      <p class="text-center text-sm font-semibold text-stone-500">
        {categoryLabel(category)} · {t('syncProgress', { current: String(index + 1), total: String(queue.length) })}
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
        <div class="h-full bg-green-600 transition-[width]" style:width="{(index / queue.length) * 100}%"></div>
      </div>

      <!-- Swipe area. touch-action lets the browser keep vertical scrolling and
           pinch-zoom while horizontal moves come through as pointer events.
           Swiping is a touch shortcut for the Next button (and the → key),
           so the area itself needs no role. -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- overflow-x-clip: the critter sliding out mustn't make the page scroll sideways. -->
      <div
        class="flex flex-1 touch-pan-y touch-pinch-zoom flex-col items-center justify-center overflow-x-clip py-10 text-center select-none"
        aria-live="polite"
        onpointerdown={onSwipeStart}
        onpointermove={onSwipeMove}
        onpointerup={onSwipeEnd}
        onpointercancel={onSwipeEnd}
      >
        {#key current.id}
          <div
            bind:this={card}
            class={['flex flex-col items-center', !dragging && 'transition-transform duration-200']}
            style:transform="translateX({dragX}px)"
            style:opacity={1 + dragX / 400}
          >
            <img class="size-32 object-contain" src={current.icon} alt="" width="128" height="128" draggable="false" />
            <p class="mt-4 text-2xl font-bold">{critterName(current)}</p>
          </div>
        {/key}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          class="min-h-14 rounded-full border-2 border-stone-300 bg-white px-4 text-lg font-bold text-stone-700 hover:bg-stone-100"
          aria-keyshortcuts="ArrowRight"
          onclick={onNextClick}
        >
          {t('syncNext')}
        </button>
        <button
          class="min-h-14 rounded-full border-2 border-green-600 bg-green-600 px-4 text-lg font-bold text-white hover:border-green-700 hover:bg-green-700"
          data-action="caught"
          aria-keyshortcuts="Enter"
          onclick={() => advance(true)}
        >
          {t('syncCaught')}
        </button>
      </div>
    {/if}
  </div>
</dialog>
