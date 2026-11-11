<script>
  import { onMount, untrack } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { i18n, t } from './i18n.svelte.js';
  import { milestoneDescription, milestoneTitle, shownTrophies } from './party.svelte.js';
  import { markTrophiesSeen, progress } from './progress.svelte.js';
  import TrophyIcon from './TrophyIcon.svelte';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  const trophies = $derived(shownTrophies(progress.trophies));
  // Taken before they're marked as seen, so the new ones keep their dot until the case is closed.
  const fresh = untrack(() => new Set(trophies.filter((trophy) => !trophy.seen).map((trophy) => trophy.key)));
  onMount(() => markTrophiesSeen(new Set(trophies.map((trophy) => trophy.key))));

  const dateFormat = $derived(new Intl.DateTimeFormat(i18n.locale, { day: 'numeric', month: 'long', year: 'numeric' }));
  /** @param {string} date */
  const earnedOn = (date) => t('trophyEarned', { date: dateFormat.format(new Date(`${date}T12:00`)) });
</script>

<Dialog title={t('trophies')} {onclose}>
  {#if trophies.length === 0}
    <p class="mt-4 text-stone-600">{t('trophiesEmpty')}</p>
  {:else}
    <ul class="mt-4 grid gap-2">
      {#each trophies as { key, date, milestone } (key)}
        <li class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_0_var(--color-stone-200)]">
          <span class="relative grid w-12 shrink-0 place-items-center">
            <TrophyIcon {milestone} size={44} />
            {#if fresh.has(key)}
              <span
                class="absolute top-0 right-0 size-3 rounded-full bg-red-500 ring-2 ring-white"
                role="img"
                aria-label={t('trophyNew')}
                data-new-dot
              ></span>
            {/if}
          </span>
          <div class="min-w-0">
            <p class="font-extrabold">{milestoneTitle(milestone)}</p>
            <p class="text-sm text-stone-600">{milestoneDescription(milestone)}</p>
            <p class="text-xs text-stone-500">{earnedOn(date)}</p>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Dialog>
