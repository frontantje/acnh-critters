<script>
  import { version } from '../../package.json';
  import { avatarIcon } from './avatars.js';
  import { i18n, LOCALES, t } from './i18n.svelte.js';
  import { activeProfile, chooseLocale, profileName, profiles, switchProfile } from './progress.svelte.js';

  /**
   * @type {{
   *   onsync: () => void,
   *   onexport: () => void,
   *   onimport: () => void,
   *   onaddprofile: () => void,
   *   oneditprofile: () => void,
   * }}
   */
  let { onsync, onexport, onimport, onaddprofile, oneditprofile } = $props();

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;
  /** @type {HTMLButtonElement} */
  let toggle;

  const shown = $derived.by(() => {
    const active = activeProfile();
    return profiles.list.length > 1 && active ? active : null;
  });
  const shownProfile = $derived(shown && profileName(shown));

  /** @param {MouseEvent} event */
  function closeOnOutsideClick(event) {
    if (open && !root.contains(/** @type {Node} */ (event.target))) open = false;
  }

  // The clicked item disappears, so focus goes to the button first, where dialogs also return it.
  /** @param {() => void} action */
  function runAndClose(action) {
    open = false;
    toggle.focus();
    action();
  }

  const itemClass = 'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-stone-100';
  const groupLabelClass = 'px-3 pt-1.5 pb-1 text-xs font-semibold text-stone-500 uppercase';
</script>

<svelte:window onclick={closeOnOutsideClick} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<!-- The profile's critter, so kids who can't read yet find their own. -->
{#snippet profileIcon(/** @type {string | null} */ avatar, className = '')}
  {#if avatar}
    <img class="size-7 shrink-0 object-contain" src={avatarIcon(avatar)} alt="" width="28" height="28" />
  {:else}
    <svg class={['size-4 shrink-0', className]} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" />
    </svg>
  {/if}
{/snippet}

{#snippet checkmark(/** @type {boolean} */ shown)}
  {#if shown}<span class="text-green-700" aria-hidden="true">✓</span>{/if}
{/snippet}

<div class="relative min-w-0" bind:this={root}>
  <button
    bind:this={toggle}
    class={[
      'flex h-11 max-w-full items-center gap-1.5 rounded-full text-stone-600 hover:bg-stone-200/70',
      shownProfile ? 'pr-2 pl-3' : 'w-11 justify-center',
    ]}
    aria-label={shownProfile ? `${t('menu')}, ${shownProfile}` : t('menu')}
    aria-expanded={open}
    aria-controls="app-menu"
    onclick={() => (open = !open)}
  >
    {#if shown}
      {@render profileIcon(shown.avatar)}
      <span class="truncate font-semibold text-stone-700" data-testid="shown-profile">{shownProfile}</span>
    {/if}
    <svg class="size-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  </button>

  {#if open}
    <!-- Scrolls, since all the items may not fit on short screens. -->
    <div
      id="app-menu"
      class="absolute top-full right-0 z-20 mt-1 max-h-[calc(100dvh_-_4.5rem)] w-max max-w-72 min-w-52 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg"
    >
      <button class={itemClass} onclick={() => runAndClose(onsync)}>{t('syncTitle')}</button>
      <button class={itemClass} onclick={() => runAndClose(onexport)}>{t('exportData')}</button>
      <button class={itemClass} onclick={() => runAndClose(onimport)}>{t('importData')}</button>

      <div class="mt-1 border-t border-stone-200 pt-1" role="group" aria-labelledby="menu-profile">
        <p id="menu-profile" class={groupLabelClass}>{t('profile')}</p>
        {#each profiles.list as profile (profile.id)}
          <button
            class={itemClass}
            aria-pressed={profile.id === profiles.active}
            onclick={() => runAndClose(() => switchProfile(profile.id))}
          >
            <span class="flex min-w-0 items-center gap-2">
              {@render profileIcon(profile.avatar, 'text-stone-500')}
              <span class="truncate">{profileName(profile)}</span>
            </span>
            {@render checkmark(profile.id === profiles.active)}
          </button>
        {/each}
        <button class={itemClass} onclick={() => runAndClose(onaddprofile)}>
          <span class="flex items-center gap-2">
            <svg class="size-4 shrink-0 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
            {t('profileAdd')}
          </span>
        </button>
        <button class={itemClass} onclick={() => runAndClose(oneditprofile)}>
          <span class="flex items-center gap-2">
            <svg class="size-4 shrink-0 text-stone-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 17.25V20h2.75L17.8 8.95l-2.75-2.75zM20.7 6.04a1 1 0 0 0 0-1.41l-1.33-1.33a1 1 0 0 0-1.41 0l-1.04 1.04 2.75 2.75z" />
            </svg>
            {t('profileEdit')}
          </span>
        </button>
      </div>

      <div class="mt-1 border-t border-stone-200 pt-1" role="group" aria-labelledby="menu-language">
        <p id="menu-language" class={groupLabelClass}>{t('language')}</p>
        {#each LOCALES as { id, label } (id)}
          <button
            class={itemClass}
            lang={id}
            aria-pressed={i18n.locale === id}
            onclick={() => runAndClose(() => chooseLocale(id))}
          >
            {label}
            {@render checkmark(i18n.locale === id)}
          </button>
        {/each}
      </div>

      <!-- Shows the version, so it's easy to tell that an update arrived. -->
      <p class="mt-1 border-t border-stone-200 px-3 pt-2.5 pb-1.5 text-xs text-stone-500" data-testid="menu-version">
        {t('version', { version })}
      </p>
    </div>
  {/if}
</div>
