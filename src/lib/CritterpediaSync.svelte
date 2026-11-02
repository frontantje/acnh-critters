<script>
  import { tick } from 'svelte';
  import { CATEGORIES, critterName, critters } from './critters.js';
  import { t } from './i18n.svelte.js';
  import { prefersReducedMotion } from './motion.js';
  import { markCaught, markSynced, progress, unmarkCaught } from './progress.svelte.js';
  import { plainButton, primaryButton, secondaryButton } from './styles.js';

  /** @typedef {import('./critters.js').Critter} Critter */

  /** @type {{ onexit: () => void }} */
  let { onexit } = $props();

  // Modal, so Escape exits and focus stays inside.
  /** @type {HTMLDialogElement} */
  let dialog;
  $effect(() => dialog.showModal());

  /** @type {Record<string, string>} */
  const CATEGORY_ICONS = { fish: 'sea-bass', bug: 'common-butterfly', sea: 'octopus' };
  /** @param {string} category */
  const categoryIcon = (category) => critters.find((critter) => critter.id === CATEGORY_ICONS[category])?.icon;
  /** @param {string} category */
  const categoryLabel = (category) => t(CATEGORIES.find((c) => c.id === category)?.label ?? 'tabAll');

  let category = $state(/** @type {string | null} */ (null));
  // Fixed when the sync starts, so catching a critter doesn't shift the steps.
  let queue = $state.raw(/** @type {Critter[]} */ ([]));
  let index = $state(0);
  const current = $derived(queue[index]);
  let verdicts = $state.raw(/** @type {boolean[]} */ ([]));
  const verdict = $derived(verdicts[index]);
  // Right after a category is finished, Back leads into it again, to its last critter.
  const backTo = $derived(
    category === null ? (verdicts.length > 0 && verdicts.length === queue.length ? queue.at(-1) : undefined) : queue[index - 1],
  );

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

  // The clicked button disappears, and focus would otherwise fall back to the body, outside the dialog.
  /** @param {string} selector */
  async function focusAfterRender(selector) {
    await tick();
    /** @type {HTMLElement | null} */ (dialog.querySelector(selector))?.focus();
  }

  /** @param {string} id */
  function start(id) {
    queue = critters.filter((critter) => critter.type === id && !progress.caught.has(critter.id));
    verdicts = [];
    index = 0;
    if (queue.length === 0) {
      markSynced(id);
      return;
    }
    category = id;
    focusAfterRender('[data-action="caught"]');
  }

  const PULSE = [
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgb(22 163 74 / 0))' },
    { transform: 'scale(1.12)', filter: 'drop-shadow(0 0 14px rgb(22 163 74 / 0.6))', offset: 0.45 },
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgb(22 163 74 / 0))' },
  ];
  /** @param {number} from */
  const shake = (from) =>
    [0, -10, 9, -6, 4, 0].map((x) => ({ transform: `translateX(${from + x}px)`, opacity: 1 + from / 400 }));

  let card = $state(/** @type {HTMLElement | undefined} */ (undefined));
  let busy = false;

  /**
   * Input is ignored while it animates, so a quick double tap can't mark a critter not shown yet.
   * @param {boolean} caught
   * @param {number} [swipedTo]
   */
  async function decide(caught, swipedTo) {
    if (busy) return;
    if (caught && !verdict) markCaught(current.id);
    if (!caught && verdict) unmarkCaught(current.id);
    const changed = [...verdicts];
    changed[index] = caught;
    verdicts = changed;
    if (card && !prefersReducedMotion()) {
      busy = true;
      const from = swipedTo ?? 0;
      try {
        await card.animate(caught ? PULSE : shake(from), { duration: caught ? 320 : 280, easing: 'ease-out' }).finished;
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
    // Always on to the first undecided critter, so Not caught can't un-catch the ones in between after going back.
    if (verdicts.length < queue.length) {
      index = verdicts.length;
      slideIn(48);
    } else {
      const finished = /** @type {string} */ (category);
      markSynced(finished);
      category = null;
      focusAfterRender(`[data-category="${finished}"]`);
    }
  }

  // Doesn't block input: the next critter can be marked while it slides in.
  /** @param {number} from */
  async function slideIn(from) {
    if (prefersReducedMotion()) return;
    await tick();
    card?.animate(
      [
        { transform: `translateX(${from}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 180, easing: 'ease-out' },
    );
  }

  // Only shows the critter with its verdict; Caught or Not caught then changes it.
  function back() {
    if (busy || !backTo) return;
    const fromList = category === null;
    if (fromList) category = backTo.type;
    index = queue.indexOf(backTo);
    slideIn(-48);
    // Focus stays on Back while it can go further, so pressing it again doesn't catch.
    if (fromList || index === 0) focusAfterRender('[data-action="caught"]');
  }

  // On a focused button, Enter still clicks that button, as screen reader users expect.
  /** @param {KeyboardEvent} event */
  function onkeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    // Repeats are ignored, so holding a key can't skip, catch or go back over a whole run of critters.
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (!event.repeat) back();
      return;
    }
    if (category === null) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!event.repeat) decide(false);
    } else if (event.key === 'Enter') {
      if (event.repeat) {
        event.preventDefault();
      } else if (!(event.target instanceof Element && event.target.closest('button'))) {
        event.preventDefault();
        decide(true);
      }
    }
  }

  // A click returns focus to Caught so Enter catches; key presses (detail 0) stay on Not caught to keep skipping.
  /** @param {MouseEvent} event */
  function onNextClick(event) {
    decide(false);
    if (event.detail > 0 && category !== null) focusAfterRender('[data-action="caught"]');
  }

  // Touch events, not pointer events: otherwise Safari took sideways swipes over and cancelled them halfway.
  const SWIPE_DISTANCE = 60;
  const SLOP = 8;
  /** @type {{ x: number, y: number, sideways: boolean | null } | null} */
  let swipe = null;
  let dragX = $state(0);
  let dragging = $state(false);
  let swipeArea = $state(/** @type {HTMLElement | undefined} */ (undefined));

  // Registered by hand: preventDefault needs a touchmove listener that isn't passive.
  $effect(() => {
    const area = swipeArea;
    if (!area) return;
    area.addEventListener('touchstart', onTouchStart, { passive: true });
    area.addEventListener('touchmove', onTouchMove, { passive: false });
    area.addEventListener('touchend', onTouchEnd);
    area.addEventListener('touchcancel', cancelSwipe);
    return () => {
      area.removeEventListener('touchstart', onTouchStart);
      area.removeEventListener('touchmove', onTouchMove);
      area.removeEventListener('touchend', onTouchEnd);
      area.removeEventListener('touchcancel', cancelSwipe);
    };
  });

  /** @param {TouchEvent} event */
  function onTouchStart(event) {
    if (event.touches.length !== 1) return cancelSwipe();
    swipe = { x: event.touches[0].clientX, y: event.touches[0].clientY, sideways: null };
  }

  /** @param {TouchEvent} event */
  function onTouchMove(event) {
    if (!swipe) return;
    if (event.touches.length !== 1) return cancelSwipe();
    const dx = event.touches[0].clientX - swipe.x;
    const dy = event.touches[0].clientY - swipe.y;
    if (swipe.sideways === null) {
      if (Math.hypot(dx, dy) < SLOP) return;
      swipe.sideways = Math.abs(dx) > Math.abs(dy);
      if (!swipe.sideways) return cancelSwipe();
      dragging = true;
    }
    if (event.cancelable) event.preventDefault();
    // Rightwards only when there's a critter to go back to.
    dragX = backTo ? dx : Math.min(0, dx);
  }

  /** @param {TouchEvent} event */
  function onTouchEnd(event) {
    if (!swipe?.sideways) return cancelSwipe();
    const dx = event.changedTouches[0].clientX - swipe.x;
    const draggedTo = dragX;
    cancelSwipe();
    if (dx < -SWIPE_DISTANCE) decide(false, draggedTo);
    else if (dx > SWIPE_DISTANCE) back();
  }

  function cancelSwipe() {
    swipe = null;
    dragX = 0;
    dragging = false;
  }
</script>

<svelte:window {onkeydown} />

{#snippet backButton()}
  <!-- Kept in place but hidden when there's nothing to go back to, so the buttons above never move. -->
  <button
    class={['mx-auto mt-3 flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-stone-600 hover:bg-stone-200/70', !backTo && 'invisible']}
    data-action="back"
    aria-keyshortcuts="ArrowLeft"
    aria-label={backTo && t('syncBackLabel', { name: critterName(backTo) })}
    onclick={back}
  >
    <span aria-hidden="true">←</span>
    {#if backTo}<img class="size-6 object-contain" src={backTo.icon} alt="" width="24" height="24" />{/if}
    {t('syncBack')}
  </button>
{/snippet}

<dialog
  bind:this={dialog}
  onclose={onexit}
  aria-labelledby="sync-title"
  class="m-0 size-full max-h-none max-w-none overscroll-contain bg-sand-dots p-0 text-stone-800"
>
  <div class="mx-auto flex min-h-full max-w-md flex-col px-4 pb-6">
    <header class="flex items-center justify-between gap-4 pt-2 pb-4">
      <h2 id="sync-title" class="text-xl font-black">{t('syncTitle')}</h2>
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
              class="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_2px_0_var(--color-stone-200)] hover:bg-green-50"
              data-category={id}
              onclick={() => start(id)}
            >
              <img class="size-12 object-contain" src={categoryIcon(id)} alt="" width="48" height="48" />
              <span class="flex-1">
                <span class="block text-lg font-extrabold">{t(label)}</span>
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

      {#if backTo}
        {@render backButton()}
      {/if}

      <button
        class={['mt-8', secondaryButton]}
        onclick={() => dialog.close()}
      >
        {t('syncDone')}
      </button>
    {:else}
      <p class="text-center text-sm font-semibold text-stone-500">
        {categoryLabel(category)} · {t('syncProgress', { current: String(index + 1), total: String(queue.length) })}
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
        <div class="h-full bg-green-600 transition-[width]" style:width="{(verdicts.length / queue.length) * 100}%"></div>
      </div>

      <!-- touch-action saves sideways moves for the swipe; overflow-x-clip keeps the sliding critter from scrolling the page. -->
      <div
        bind:this={swipeArea}
        class="flex flex-1 touch-pan-y touch-pinch-zoom flex-col items-center justify-center overflow-x-clip py-10 text-center select-none"
        aria-live="polite"
      >
        {#key current.id}
          <div
            bind:this={card}
            class={['flex flex-col items-center', !dragging && 'transition-transform duration-200']}
            style:transform="translateX({dragX}px)"
            style:opacity={1 - Math.abs(dragX) / 400}
          >
            <div class="relative">
              <img class="size-32 object-contain" src={current.icon} alt="" width="128" height="128" draggable="false" />
              {#if verdict !== undefined}
                <span
                  class={[
                    'absolute -right-2 -bottom-1 grid size-11 place-items-center rounded-full text-2xl font-bold text-white shadow-md ring-4 ring-sand',
                    verdict ? 'bg-green-600' : 'bg-red-600',
                  ]}
                  data-verdict={verdict ? 'caught' : 'not-caught'}
                >
                  <span aria-hidden="true">{verdict ? '✓' : '✗'}</span>
                  <span class="sr-only">{verdict ? t('syncVerdictCaught') : t('syncVerdictNotCaught')}</span>
                </span>
              {/if}
            </div>
            <p class="mt-4 text-2xl font-black">{critterName(current)}</p>
          </div>
        {/key}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          class={['min-h-14 text-lg', plainButton]}
          aria-keyshortcuts="ArrowRight"
          onclick={onNextClick}
        >
          {t('syncNext')}
        </button>
        <button
          class={['min-h-14 text-lg', primaryButton]}
          data-action="caught"
          aria-keyshortcuts="Enter"
          onclick={() => decide(true)}
        >
          {t('syncCaught')}
        </button>
      </div>
      {@render backButton()}
    {/if}
  </div>
</dialog>
