<script>
  import { critterName, locationText, notesText, timeText } from './critters.js';
  import { t } from './i18n.svelte.js';
  import { progress, toggleCaught } from './progress.svelte.js';

  /**
   * @type {{
   *   critter: import('./critters.js').Critter,
   *   hemisphere: import('./critters.js').Hemisphere,
   *   month: number,
   *   leavingSoon?: boolean,
   * }}
   */
  let { critter, hemisphere, month, leavingSoon = false } = $props();

  const caught = $derived(progress.caught.has(critter.id));
  // Only uncaught critters need the "last chance" warning.
  const warn = $derived(leavingSoon && !caught);
</script>

<!-- Phones: icon | stacked details | button. md and up: one column per field. -->
<li
  class={[
    'grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 border-b border-stone-200 px-3 py-3',
    'md:grid-cols-[4rem_1fr_1.5fr_1fr_1fr_auto] md:gap-x-4 md:px-4',
    caught ? 'bg-green-50' : warn ? 'bg-red-50' : 'bg-white',
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
  <!-- md:contents turns each field into its own column of the row's grid. -->
  <div class="flex min-w-0 flex-col gap-0.5 md:contents">
    <span class="font-bold">{critterName(critter)}</span>
    <!-- The red tint in words, for screen readers. -->
    {#if warn}<p class="sr-only">{t('leavingSoon')}</p>{/if}
    <span>{locationText(critter)}</span>
    <span>{timeText(critter, hemisphere, month)}</span>
    <span class="text-sm text-stone-500">{notesText(critter)}</span>
  </div>
  <button
    class={[
      'min-h-12 w-28 rounded-full border-2 px-2 py-2 font-bold whitespace-nowrap md:w-auto md:px-6 md:py-3 md:text-lg',
      caught
        ? 'border-green-600 bg-white text-green-700 hover:bg-green-100'
        : 'border-green-600 bg-green-600 text-white hover:border-green-700 hover:bg-green-700',
    ]}
    onclick={() => toggleCaught(critter.id)}
  >
    {caught ? t('caught') : t('caughtIt')}
  </button>
</li>
