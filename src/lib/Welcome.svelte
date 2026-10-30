<script>
  import AvatarPicker from './AvatarPicker.svelte';
  import { avatarIcon } from './avatars.js';
  import { t } from './i18n.svelte.js';
  import NameField from './NameField.svelte';
  import { nameAllowed, progress, setAvatar, setName, takenName } from './progress.svelte.js';
  import { primaryButton } from './styles.js';

  /**
   * @type {{ onimport: () => void, onsync: () => void, onskip: () => void, backTo: string | null, onback: () => void }}
   */
  let { onimport, onsync, onskip, backTo, onback } = $props();

  // Only a fresh start or a deleted last profile gets here without a name; ones from the menu have it.
  let name = $state('');
  let avatar = $state(/** @type {string | null} */ (null));
</script>

<main class="mx-4 mt-[12vh] max-w-md rounded-2xl bg-white p-8 text-center shadow-md sm:mx-auto">
  {#if progress.avatar}
    <img class="mx-auto mb-2 size-24 object-contain" src={avatarIcon(progress.avatar)} alt="" width="96" height="96" />
  {/if}
  <h1 class="text-2xl font-bold">{progress.name ? t('welcomeNamed', { name: progress.name }) : t('welcomeTitle')}</h1>
  <p class="mt-2 text-stone-600">{t('welcomeIntro')}</p>

  {#if !progress.name}
    <form
      class="mt-8 grid gap-3 text-left"
      onsubmit={(event) => {
        event.preventDefault();
        setAvatar(avatar);
        setName(name);
      }}
    >
      <NameField bind:value={name} label={t('welcomeNameLabel')} hint={t('profileNameHint')} taken={takenName(name, null)} autofocus />
      <AvatarPicker bind:value={avatar} id={null} />
      <button class={primaryButton} disabled={!nameAllowed(name, null)}>{t('welcomeNext')}</button>
    </form>
    <!-- A code from another device brings its name along. -->
    <button class="mt-4 text-green-700 underline hover:text-green-800" onclick={onimport}>
      {t('welcomeImport')}
    </button>
  {:else}
    <div class="mt-8 grid gap-3">
      <button class="rounded-full bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700" onclick={onimport}>
        {t('welcomeImport')}
      </button>
      <button
        class="rounded-full border-2 border-green-600 px-5 py-3 font-bold text-green-700 hover:bg-green-50"
        onclick={onsync}
      >
        {t('welcomeSync')}
      </button>
      <button class="mt-1 text-stone-500 underline hover:text-stone-700" onclick={onskip}>
        {t('welcomeSkip')}
      </button>
    </div>
  {/if}

  {#if backTo}
    <button class="mt-3 w-full border-t border-stone-200 pt-4 text-stone-500 hover:text-stone-700" onclick={onback}>
      <span aria-hidden="true">←</span>
      {t('welcomeBack', { name: backTo })}
    </button>
  {/if}
</main>
