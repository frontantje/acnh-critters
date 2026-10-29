<script>
  import { t } from './i18n.svelte.js';
  import { importProgress } from './progress.svelte.js';

  /**
   * @type {{
   *   replacing: boolean,
   *   onimported: () => void,
   *   onclose: () => void,
   * }}
   */
  let { replacing, onimported, onclose } = $props();

  /** @type {HTMLDialogElement} */
  let dialog;
  $effect(() => dialog.showModal());

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
    onimported();
    dialog.close();
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

<dialog
  bind:this={dialog}
  {onclose}
  aria-labelledby="import-title"
  class="m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl bg-amber-50 p-0 text-stone-800 shadow-xl backdrop:bg-stone-900/40"
>
  <div class="p-5">
    <div class="flex items-start justify-between gap-4">
      <h2 id="import-title" class="pt-2 text-xl font-bold">{t('importData')}</h2>
      <button
        class="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-200/70"
        aria-label={t('exportClose')}
        onclick={() => dialog.close()}
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
        </svg>
      </button>
    </div>
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
      <button
        class="min-h-12 rounded-full border-2 border-green-600 bg-green-600 px-4 py-2 font-bold text-white hover:border-green-700 hover:bg-green-700 disabled:opacity-50"
        disabled={!text.trim()}
      >
        {replacing ? t('importReplaceButton') : t('importButton')}
      </button>
    </form>

    <button class="mt-3 w-full text-center text-green-700 underline hover:text-green-800" onclick={() => fileInput.click()}>
      {t('importFromFile')}
    </button>
    <!-- .txt from "Download as text file"; .json from older exports. -->
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
  </div>
</dialog>
