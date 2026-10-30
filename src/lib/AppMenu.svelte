<script>
  import { version } from '../../package.json';
  import { i18n, LOCALES, setLocale, t } from './i18n.svelte.js';
  import { progress } from './progress.svelte.js';

  /** @type {{ onsync: () => void, onexport: () => void, onimport: () => void }} */
  let { onsync, onexport, onimport } = $props();

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;
  /** @type {HTMLButtonElement} */
  let toggle;

  /** @param {MouseEvent} event */
  function closeOnOutsideClick(event) {
    if (open && !root.contains(/** @type {Node} */ (event.target))) open = false;
  }

  // Focus moves back to the menu button first, since the clicked item disappears
  // with the menu (and the dialogs return focus to it when they close).
  /** @param {() => void} action */
  function runAndClose(action) {
    open = false;
    toggle.focus();
    action();
  }
</script>

<svelte:window onclick={closeOnOutsideClick} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="relative" bind:this={root}>
  <button
    bind:this={toggle}
    class="grid size-11 place-items-center rounded-full text-stone-600 hover:bg-stone-200/70"
    aria-label={t('menu')}
    aria-expanded={open}
    aria-controls="app-menu"
    onclick={() => (open = !open)}
  >
    <svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  </button>

  {#if open}
    <div
      id="app-menu"
      class="absolute top-full right-0 z-20 mt-1 min-w-52 rounded-xl border border-stone-200 bg-white p-1 shadow-lg"
    >
      <button class="w-full rounded-lg px-3 py-2.5 text-left hover:bg-stone-100" onclick={() => runAndClose(onsync)}>
        {t('syncTitle')}
      </button>
      <button class="w-full rounded-lg px-3 py-2.5 text-left hover:bg-stone-100" onclick={() => runAndClose(onexport)}>
        {t('exportData')}
      </button>
      <button class="w-full rounded-lg px-3 py-2.5 text-left hover:bg-stone-100" onclick={() => runAndClose(onimport)}>
        {t('importData')}
      </button>

      <div class="mt-1 border-t border-stone-200 pt-1" role="group" aria-labelledby="menu-language">
        <p id="menu-language" class="px-3 pt-1.5 pb-1 text-xs font-semibold text-stone-500 uppercase">
          {t('language')}
        </p>
        {#each LOCALES as { id, label } (id)}
          <button
            class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-stone-100"
            lang={id}
            aria-pressed={i18n.locale === id}
            onclick={() => runAndClose(() => setLocale(id))}
          >
            {label}
            {#if i18n.locale === id}<span class="text-green-700" aria-hidden="true">✓</span>{/if}
          </button>
        {/each}
      </div>

      <!-- The name given when exporting, or carried by an imported code. -->
      {#if progress.name}
        <p class="mt-1 flex max-w-64 items-center gap-2 border-t border-stone-200 px-3 pt-2.5 pb-1.5 text-sm text-stone-500">
          <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" />
          </svg>
          <span class="sr-only">{t('menuName')}:</span>
          <span class="truncate" data-testid="menu-name">{progress.name}</span>
        </p>
      {/if}

      <!-- The app version (package.json; see CHANGELOG.md), e.g. to see that an update arrived. -->
      <p
        class={['px-3 pt-1 pb-1.5 text-xs text-stone-500', !progress.name && 'mt-1 border-t border-stone-200 pt-2.5']}
        data-testid="menu-version"
      >
        {t('version', { version })}
      </p>
    </div>
  {/if}
</div>
