<script>
  import AppMenu from './AppMenu.svelte';
  import CritterRow from './CritterRow.svelte';
  import {
    critters,
    daysLeftInMonth,
    isAvailableIn,
    monthName,
    monthsLeft,
    sortForMonth,
    TABS,
  } from './critters.js';
  import { clock } from './clock.svelte.js';
  import { t } from './i18n.svelte.js';
  import { progress, setHemisphere, toggleShowCaught } from './progress.svelte.js';

  /** @type {{ onsync: () => void, onexport: () => void, onimport: () => void }} */
  let { onsync, onexport, onimport } = $props();

  // Only these parts of the time matter, so the list only re-sorts when they change.
  const hour = $derived(clock.now.getHours());
  const currentMonth = $derived(clock.now.getMonth() + 1);
  const daysLeft = $derived(daysLeftInMonth(clock.now));

  let tab = $state('all');
  // 1–12, or 0 for all months. Starts at the month the app was opened in.
  let month = $state(new Date().getMonth() + 1);

  const inTabAndMonth = $derived(
    critters.filter(
      (critter) =>
        (tab === 'all' || critter.type === tab) &&
        (month === 0 || isAvailableIn(critter, progress.hemisphere, month)),
    ),
  );
  const visible = $derived(
    sortForMonth(
      progress.showCaught ? inTabAndMonth : inTabAndMonth.filter((critter) => !progress.caught.has(critter.id)),
      progress.hemisphere,
      month,
      hour,
    ),
  );

  // In the last days of the actual month (less than a week to go), critters
  // that won't be there next month are flagged.
  const monthEndingSoon = $derived(month === currentMonth && daysLeft < 7);

  const selectClass = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-stone-800 md:w-auto';
</script>

<div class="mx-auto max-w-6xl">
  <header class="flex items-center justify-between px-3 pt-2 md:px-4 md:pt-4">
    <h1 class="text-xl font-bold md:text-2xl">ACNH Critters</h1>
    <AppMenu {onsync} {onexport} {onimport} />
  </header>

  <!-- Filters and tabs stay pinned while scrolling. Phones: filters above the tabs.
       md and up: tabs on the left, filters on the right. -->
  <div
    class="sticky top-0 z-10 flex flex-col gap-2 border-b-2 border-stone-200 bg-amber-50 px-3 pt-2 md:flex-row md:items-end md:justify-between md:gap-6 md:px-4"
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

    <!-- -mb-0.5 lets the active tab's underline cover the bar's bottom border. -->
    <div class="-mb-0.5 flex items-center gap-2 md:gap-4">
      <div class="flex min-w-0 flex-1 overflow-x-auto" role="tablist">
        {#each TABS as { id, label } (id)}
          <button
            role="tab"
            aria-selected={tab === id}
            class={[
              'grow border-b-4 px-1 py-2.5 font-semibold whitespace-nowrap md:grow-0 md:px-4 md:py-3',
              tab === id ? 'border-green-600 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800',
            ]}
            onclick={() => (tab = id)}
          >
            {t(label)}
          </button>
        {/each}
      </div>

      <!-- Phones: short label above the switch. md and up: full label beside it. -->
      <button
        role="switch"
        aria-checked={progress.showCaught}
        aria-label={t('showCaught')}
        class="flex shrink-0 flex-col items-center justify-center gap-1 self-stretch px-1 text-xs font-semibold text-stone-600 md:flex-row md:gap-2 md:text-sm"
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

  <ul>
    {#each visible as critter (critter.id)}
      <CritterRow
        {critter}
        hemisphere={progress.hemisphere}
        {month}
        leavingSoon={monthEndingSoon && monthsLeft(critter, progress.hemisphere, month) === 1}
      />
    {:else}
      <li class="p-8 text-center text-stone-500">
        {inTabAndMonth.length ? t('allCaught') : t('nothingThisMonth')}
      </li>
    {/each}
  </ul>
</div>
