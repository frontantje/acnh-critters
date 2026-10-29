<script>
  import { exportProgress } from './progress.svelte.js';

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;

  /** @param {MouseEvent} event */
  function closeOnOutsideClick(event) {
    if (open && !root.contains(/** @type {Node} */ (event.target))) open = false;
  }

  function exportAndClose() {
    exportProgress();
    open = false;
  }
</script>

<svelte:window onclick={closeOnOutsideClick} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="relative" bind:this={root}>
  <button
    class="grid size-11 place-items-center rounded-full text-stone-600 hover:bg-stone-200/70"
    aria-label="Menu"
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
      class="absolute top-full right-0 z-20 mt-1 min-w-48 rounded-xl border border-stone-200 bg-white p-1 shadow-lg"
    >
      <button class="w-full rounded-lg px-3 py-2.5 text-left hover:bg-stone-100" onclick={exportAndClose}>
        Export data
      </button>
    </div>
  {/if}
</div>
