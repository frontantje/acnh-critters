<script>
  import Dialog from './Dialog.svelte';
  import { i18n, t } from './i18n.svelte.js';
  import { milestoneDescription, milestoneIcons, milestoneTitle, shownTrophies } from './party.svelte.js';
  import { progress } from './progress.svelte.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  const trophies = $derived(shownTrophies(progress.trophies));

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
          <span class="flex shrink-0 items-end" aria-hidden="true">
            {#each milestoneIcons(milestone) as icon (icon)}
              <img class="size-10 object-contain" src={icon} alt="" width="40" height="40" />
            {/each}
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
