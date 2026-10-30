<script>
  import { tick, untrack } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { t } from './i18n.svelte.js';
  import NameField from './NameField.svelte';
  import {
    activeProfile,
    addProfile,
    deleteProfile,
    nameAllowed,
    profileName,
    profiles,
    progress,
    setName,
    takenName,
  } from './progress.svelte.js';
  import { primaryButton } from './styles.js';

  /**
   * Adds a profile (which then starts on the welcome screen), or renames or
   * deletes the one shown.
   * @type {{ adding: boolean, onclose: () => void }}
   */
  let { adding, onclose } = $props();

  /** @type {{ close: () => void }} */
  let modal;

  // The dialog doesn't switch between adding and editing while it's open.
  let name = $state(untrack(() => (adding ? '' : progress.name)));
  /** The profile being named: null for a new one. */
  const id = $derived(adding ? null : profiles.active);

  function submit() {
    if (adding ? addProfile(name) : setName(name)) modal.close();
  }

  /** What's about to be deleted, while asking. */
  let deleting = $state(/** @type {{ name: string, last: boolean } | null} */ (null));
  let deleteButton = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));
  let keepButton = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));

  // The pressed button disappears, so focus moves on to the safe choice, or
  // back to the delete button.
  async function askToDelete() {
    const shown = activeProfile();
    if (!shown) return;
    deleting = { name: profileName(shown), last: profiles.list.length === 1 };
    await tick();
    keepButton?.focus();
  }

  async function keep() {
    deleting = null;
    await tick();
    deleteButton?.focus();
  }

  function remove() {
    deleteProfile();
    modal.close();
  }
</script>

<Dialog bind:this={modal} title={adding ? t('profileAdd') : t('profileEdit')} {onclose}>
  {#if adding}
    <p class="mt-1 text-stone-600">{t('profileAddIntro')}</p>
  {/if}

  <form
    class="mt-5 grid gap-3"
    onsubmit={(event) => {
      event.preventDefault();
      submit();
    }}
  >
    <!-- A new profile starts with typing its name. One shown can go without
         (it's then called "Profile 2" and so on). -->
    <NameField
      bind:value={name}
      label={adding ? t('profileNameLabel') : t('profileNameOptional')}
      hint={t('profileNameHint')}
      taken={takenName(name, id)}
      autofocus={adding}
    />
    <button class={primaryButton} disabled={!nameAllowed(name, id)}>
      {adding ? t('profileAddButton') : t('profileSave')}
    </button>
  </form>

  {#if !adding}
    <div class="mt-6 border-t border-stone-300 pt-5">
      {#if deleting}
        <div id="profile-delete-question">
          <p class="font-semibold text-red-800">{t('profileDeleteConfirm', { name: deleting.name })}</p>
          {#if deleting.last}
            <p class="mt-2 text-stone-600">{t('profileDeleteLast')}</p>
          {/if}
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            bind:this={keepButton}
            class="min-h-12 rounded-full border-2 border-stone-300 bg-white px-4 py-2 font-bold text-stone-700 hover:bg-stone-100"
            aria-describedby="profile-delete-question"
            onclick={keep}
          >
            {t('profileDeleteNo')}
          </button>
          <button
            class="min-h-12 rounded-full border-2 border-red-600 bg-red-600 px-4 py-2 font-bold text-white hover:border-red-700 hover:bg-red-700"
            aria-describedby="profile-delete-question"
            onclick={remove}
          >
            {t('profileDeleteYes')}
          </button>
        </div>
      {:else}
        <button
          bind:this={deleteButton}
          class="min-h-12 w-full rounded-full border-2 border-red-600 bg-white px-4 py-2 font-bold text-red-700 hover:bg-red-50"
          onclick={askToDelete}
        >
          {t('profileDelete')}
        </button>
      {/if}
    </div>
  {/if}
</Dialog>
