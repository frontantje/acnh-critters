<script>
  import AppMenu from './AppMenu.svelte';
  import CritterRow from './CritterRow.svelte';
  import { countCaught, critters, isAvailableIn, monthName, monthsLeft, sortForMonth, TABS } from './critters.js';
  import { clock } from './clock.svelte.js';
  import { t } from './i18n.svelte.js';
  import { progress, setHemisphere, toggleShowCaught } from './progress.svelte.js';

  /**
   * @type {{
   *   onsync: () => void,
   *   onexport: () => void,
   *   onimport: () => void,
   *   onaddprofile: () => void,
   *   oneditprofile: () => void,
   *   ontrophies: () => void,
   * }}
   */
  let { onsync, onexport, onimport, onaddprofile, oneditprofile, ontrophies } = $props();

  // Only the hour matters for sorting, so the list only re-sorts when it changes.
  const hour = $derived(clock.now.getHours());

  let tab = $state('all');
  let month = $state(new Date().getMonth() + 1);

  const inTabAndMonth = $derived(
    critters.filter(
      (critter) =>
        (tab === 'all' || critter.type === tab) &&
        (month === 0 || isAvailableIn(critter, progress.hemisphere, month)),
    ),
  );
  /** @param {import('./critters.js').Critter} critter */
  function isFlagged(critter) {
    return month !== 0 && !progress.caught.has(critter.id) && monthsLeft(critter, progress.hemisphere, month) === 1;
  }

  const visible = $derived(
    sortForMonth(
      progress.showCaught ? inTabAndMonth : inTabAndMonth.filter((critter) => !progress.caught.has(critter.id)),
      progress.hemisphere,
      month,
      hour,
    ),
  );

  const counts = $derived(countCaught(critters, progress.caught));

  const selectClass = 'w-full rounded-xl border-2 border-stone-200 bg-white px-2 py-1.5 font-semibold text-stone-800 md:w-auto';
</script>

<div class="mx-auto max-w-6xl">
  <header class="flex items-center justify-between gap-2 px-3 pt-2 md:px-4 md:pt-4">
    <div class="shrink-0">
      <h1 class="text-xl font-black md:text-2xl">ACNH Critters</h1>
      <p class="text-sm font-bold text-stone-500" data-testid="caught-total">
        {t('caughtCount', { caught: String(counts.all.caught), total: String(counts.all.total) })}
      </p>
    </div>
    <AppMenu {onsync} {onexport} {onimport} {onaddprofile} {oneditprofile} {ontrophies} />
  </header>

  <div
    class="bg-sand-dots sticky top-0 z-10 flex flex-col gap-2 px-3 pt-2 pb-2 md:flex-row md:items-center md:justify-between md:gap-6 md:px-4"
  >
    <div class="flex gap-2 md:order-last md:gap-4 md:self-center">
      <label class="flex flex-1 items-center gap-2 text-stone-600">
        <span class="sr-only lg:not-sr-only">{t('hemisphere')}</span>
        <select class={selectClass} value={progress.hemisphere} onchange={(event) => setHemisphere(event.currentTarget.value)}>
          <option value="north">{t('northern')}</option>
          <option value="south">{t('southern')}</option>
        </select>
      </label>

      <label class="flex flex-1 items-center gap-2 text-stone-600">
        <span class="sr-only lg:not-sr-only">{t('month')}</span>
        <select class={selectClass} bind:value={month}>
          <option value={0}>{t('allMonths')}</option>
          {#each { length: 12 }, index}
            <option value={index + 1}>{monthName(index + 1)}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="flex items-center gap-2 md:gap-4">
      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" role="tablist">
        {#each TABS as { id, label } (id)}
          <button
            role="tab"
            aria-selected={tab === id}
            class={[
              'min-h-11 grow rounded-full px-2 leading-tight font-extrabold whitespace-nowrap md:grow-0 md:px-5',
              tab === id ? 'bg-stone-800 text-stone-50' : 'bg-stone-50 text-stone-500 hover:text-stone-800',
            ]}
            onclick={() => (tab = id)}
          >
            <span class="block">
              <!-- "Meerestiere" doesn't fit next to the other tabs on a phone. -->
              {#if id === 'sea'}
                <span class="md:hidden">{t('tabSeaShort')}</span>
                <span class="hidden md:inline">{t(label)}</span>
              {:else}
                {t(label)}
              {/if}
            </span>
            <!-- Hidden from screen readers, so a tab's name stays its category; the header reads out the total. -->
            {#if id !== 'all'}
              <span class="block text-[11px] font-bold opacity-80" aria-hidden="true">{counts[id].caught}/{counts[id].total}</span>
            {/if}
          </button>
        {/each}
      </div>

      <button
        role="switch"
        aria-checked={progress.showCaught}
        aria-label={t('showCaught')}
        class="flex shrink-0 flex-col items-center justify-center gap-1 self-stretch px-1 text-xs font-bold text-stone-600 md:flex-row md:gap-2 md:text-sm"
        onclick={toggleShowCaught}
      >
        <span class="md:hidden">{t('showCaughtShort')}</span>
        <span class="hidden md:inline">{t('showCaught')}</span>
        <span class={['relative h-5 w-9 rounded-full transition-colors', progress.showCaught ? 'bg-green-600' : 'bg-stone-300']}>
          <span
            class={[
              'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
              progress.showCaught && 'translate-x-4',
            ]}
          ></span>
        </span>
      </button>
    </div>
  </div>

  <ul class="grid gap-2 px-3 pb-6 md:px-4">
    {#each visible as critter (critter.id)}
      <CritterRow
        {critter}
        hemisphere={progress.hemisphere}
        {month}
        flagged={isFlagged(critter)}
      />
    {:else}
      <li class="rounded-2xl bg-white p-8 text-center text-stone-500">
        {inTabAndMonth.length ? t('allCaught') : t('nothingThisMonth')}
      </li>
    {/each}
  </ul>
</div>
