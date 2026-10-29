<script>
  import { importProgress } from './progress.svelte.js';

  /** @type {{ onimport: () => void, onsetup: () => void, onskip: () => void }} */
  let { onimport, onsetup, onskip } = $props();

  let error = $state('');
  /** @type {HTMLInputElement} */
  let fileInput;

  /** @param {Event & { currentTarget: HTMLInputElement }} event */
  async function importFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Lets the same file be picked again after an error.
    input.value = '';
    if (!file) return;

    try {
      importProgress(await file.text());
      onimport();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<main class="mx-4 mt-[12vh] max-w-md rounded-2xl bg-white p-8 text-center shadow-md sm:mx-auto">
  <h1 class="text-2xl font-bold">Welcome to ACNH Critters</h1>
  <p class="mt-2 text-stone-600">Keep track of every fish, insect and sea creature you've caught.</p>

  <div class="mt-8 grid gap-3">
    <button
      class="rounded-full bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
      onclick={() => fileInput.click()}
    >
      Import data from another device
    </button>
    <button
      class="rounded-full border-2 border-green-600 px-5 py-3 font-bold text-green-700 hover:bg-green-50"
      onclick={onsetup}
    >
      Run the initial setup
    </button>
    <button class="mt-1 text-stone-500 underline hover:text-stone-700" onclick={onskip}>
      No thanks, just show me the list
    </button>
  </div>

  <input bind:this={fileInput} type="file" accept=".json,application/json" class="hidden" onchange={importFile} />

  {#if error}
    <p class="mt-4 text-red-700" role="alert">{error}</p>
  {/if}
</main>
