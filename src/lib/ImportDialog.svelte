<script>
  import Dialog from './Dialog.svelte';
  import { t } from './i18n.svelte.js';
  import { importProgress } from './progress.svelte.js';
  import { primaryButton } from './styles.js';

  /** @type {{ replacing: boolean, onclose: () => void }} */
  let { replacing, onclose } = $props();

  /** @type {{ close: () => void }} */
  let modal;
  let text = $state('');
  let error = $state('');
  /** @type {HTMLInputElement} */
  let fileInput;

  /** @param {string} value */
  function importText(value) {
    error = '';
    try {
      importProgress(value);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      return;
    }
    modal.close();
  }

  /** @param {Event & { currentTarget: HTMLInputElement }} event */
  async function importFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Lets the same file be picked again after an error.
    input.value = '';
    if (file) importText(await file.text());
  }
</script>

<Dialog bind:this={modal} title={t('importData')} {onclose}>
  <p class="mt-1 text-stone-600">{t('importIntro')}</p>
  {#if replacing}
    <p class="mt-3 rounded-lg bg-amber-100 px-3 py-2 font-semibold text-amber-900">{t('importReplaces')}</p>
  {/if}

  <form
    class="mt-5 grid gap-3"
    onsubmit={(event) => {
      event.preventDefault();
      importText(text);
    }}
  >
    <label class="font-semibold">
      {t('importLabel')}
      <textarea
        class="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 font-mono text-sm font-normal"
        rows="4"
        bind:value={text}
      ></textarea>
    </label>
    <button class={primaryButton} disabled={!text.trim()}>
      {replacing ? t('importReplaceButton') : t('importButton')}
    </button>
  </form>

  <button class="mt-3 w-full text-center text-green-700 underline hover:text-green-800" onclick={() => fileInput.click()}>
    {t('importFromFile')}
  </button>
  <!-- .json too, for files from older exports. -->
  <input
    bind:this={fileInput}
    type="file"
    accept=".txt,.json,text/plain,application/json"
    class="hidden"
    onchange={importFile}
  />

  {#if error}
    <p class="mt-4 text-red-700" role="alert">{error}</p>
  {/if}
</Dialog>
