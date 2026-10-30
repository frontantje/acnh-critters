<script>
  import { t } from './i18n.svelte.js';

  /**
   * Open while mounted; showModal() handles Escape, keeps focus inside and returns it afterwards.
   * @type {{ title: string, onclose: () => void, children: import('svelte').Snippet }}
   */
  let { title, onclose, children } = $props();

  const titleId = $props.id();
  /** @type {HTMLDialogElement} */
  let dialog;
  $effect(() => dialog.showModal());

  export function close() {
    dialog.close();
  }
</script>

<dialog
  bind:this={dialog}
  {onclose}
  aria-labelledby={titleId}
  class="m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl bg-amber-50 p-0 text-stone-800 shadow-xl backdrop:bg-stone-900/40"
>
  <div class="p-5">
    <div class="flex items-start justify-between gap-4">
      <h2 id={titleId} class="pt-2 text-xl font-bold">{title}</h2>
      <button
        class="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-200/70"
        aria-label={t('close')}
        onclick={close}
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
        </svg>
      </button>
    </div>
    {@render children()}
  </div>
</dialog>
