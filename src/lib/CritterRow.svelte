<script>
  import { confettiFrom } from './confetti.js';
  import { critterName, locationText, monthsLeft, notesText, timeText } from './critters.js';
  import { t } from './i18n.svelte.js';
  import { progress, toggleCaught } from './progress.svelte.js';

  /**
   * @type {{
   *   critter: import('./critters.js').Critter,
   *   hemisphere: import('./critters.js').Hemisphere,
   *   month: number,
   *   flagged?: boolean,
   * }}
   */
  let { critter, hemisphere, month, flagged = false } = $props();

  const caught = $derived(progress.caught.has(critter.id));
  const yearRound = $derived(monthsLeft(critter, hemisphere, 1) === 12);
  // Caught wins. Flagged critters leave next month, so they're never year-round.
  const kind = $derived(caught ? 'caught' : flagged ? 'leaving' : yearRound ? 'allYear' : null);

  // In words, not only colour, so kids who don't see colours well can tell the rows apart.
  /** @type {Record<string, { icon: string, label: import('./i18n.svelte.js').MessageKey, class: string }>} */
  const CHIPS = {
    leaving: { icon: '⏳', label: 'chipLeaving', class: 'bg-red-100 text-red-800' },
    allYear: { icon: '↻', label: 'chipAllYear', class: 'bg-sky-100 text-sky-800' },
    caught: { icon: '✓', label: 'chipCaught', class: 'bg-green-100 text-green-800' },
  };

  // Off until the pointer leaves, so a critter just caught doesn't turn red under the mouse right away.
  let hoverWarns = $state(true);

  /** @param {MouseEvent & { currentTarget: HTMLButtonElement }} event */
  function onclick(event) {
    // Confetti first, since with caught critters hidden the row goes away once toggled.
    if (!caught) confettiFrom(event.currentTarget);
    toggleCaught(critter.id);
    hoverWarns = false;
  }
</script>

<li
  class={[
    'grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 rounded-2xl py-2.5 pr-2.5 pl-2',
    'md:grid-cols-[4rem_1fr_1.5fr_1fr_1fr_auto] md:gap-x-4 md:p-3',
    caught ? 'bg-green-50 shadow-[0_2px_0_var(--color-green-100)]' : 'bg-white shadow-[0_2px_0_var(--color-stone-200)]',
  ]}
>
  <img
    class="size-12 self-start object-contain md:size-16 md:self-center"
    src={critter.icon}
    alt=""
    width="64"
    height="64"
    loading="lazy"
  />
  <!-- md:contents lets each field be its own column of the row's grid. -->
  <div class="flex min-w-0 flex-col gap-0.5 md:contents">
    <div class="min-w-0">
      <span class="font-extrabold">{critterName(critter)}</span>
      {#if kind}
        <p class={['mt-1 flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold', CHIPS[kind].class]}>
          <i class="not-italic" aria-hidden="true">{CHIPS[kind].icon}</i>
          {t(CHIPS[kind].label)}
        </p>
      {/if}
    </div>
    <!-- One line on phones, so the cards stay short; md:contents gives each its own column again. -->
    <div class="md:contents">
      <span class="after:content-['\00a0·'] md:after:content-none">{locationText(critter)}</span>
      <span>{timeText(critter, hemisphere, month)}</span>
    </div>
    <span class="text-sm text-stone-500">{notesText(critter)}</span>
  </div>
  <!-- A caught one turns red with a ✗ while hovered or pressed, since pressing it un-catches. -->
  <button
    class={[
      'group min-h-12 w-28 rounded-full border-2 px-2 py-2 font-extrabold whitespace-nowrap active:translate-y-0.5 md:w-auto md:min-w-36 md:px-6 md:py-3 md:text-lg',
      caught
        ? [
            'border-green-600 bg-white text-green-700 shadow-[0_4px_0_var(--color-green-100)]',
            'active:border-red-600 active:bg-red-50 active:text-red-600 active:shadow-[0_2px_0_var(--color-red-100)]',
            hoverWarns && 'hover:border-red-600 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_4px_0_var(--color-red-100)]',
          ]
        : 'border-green-600 bg-green-600 text-white shadow-[0_4px_0_var(--color-green-800)] hover:border-green-700 hover:bg-green-700 active:shadow-[0_2px_0_var(--color-green-800)]',
    ]}
    aria-label={caught ? t('caught') : undefined}
    {onclick}
    onpointerleave={() => (hoverWarns = true)}
  >
    {#if caught}
      <span class={['text-2xl leading-none group-active:hidden', hoverWarns && 'group-hover:hidden']} aria-hidden="true">✓</span>
      <span class={['hidden text-2xl leading-none group-active:inline', hoverWarns && 'group-hover:inline']} aria-hidden="true">✗</span>
    {:else}
      {t('caughtIt')}
    {/if}
  </button>
</li>
