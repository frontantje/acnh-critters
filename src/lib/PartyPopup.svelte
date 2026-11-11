<script>
  import { confettiFrom } from './confetti.js';
  import { t } from './i18n.svelte.js';
  import { ignoreHeldEnter } from './keys.js';
  import { milestoneIcons, milestoneTitle } from './party.svelte.js';
  import { primaryButton } from './styles.js';

  /** @type {{ milestone: import('./party.svelte.js').Milestone, onclose: () => void }} */
  let { milestone, onclose } = $props();

  const titleId = $props.id();
  /** @type {HTMLDialogElement} */
  let dialog;
  /** @type {HTMLElement} */
  let picture;

  $effect(() => {
    dialog.showModal();
    const { size } = milestone;
    const timers = Array.from({ length: Math.ceil(size / 2) }, (_, i) =>
      setTimeout(() => confettiFrom(picture, { pieces: 20 + size * 25, spread: 1 + size * 0.5 }), i * 450),
    );
    return () => timers.forEach(clearTimeout);
  });
</script>

<dialog
  bind:this={dialog}
  {onclose}
  onkeydown={ignoreHeldEnter}
  aria-labelledby={titleId}
  class="m-auto w-[calc(100%_-_2rem)] max-w-sm overflow-visible rounded-3xl bg-stone-50 p-0 text-center text-stone-800 shadow-xl backdrop:bg-stone-900/40"
>
  <div class="grid justify-items-center gap-5 px-6 pt-8 pb-6">
    <div bind:this={picture} class="flex items-end justify-center gap-2" aria-hidden="true">
      {#each milestoneIcons(milestone) as icon (icon)}
        <img class="size-20 object-contain" src={icon} alt="" width="80" height="80" />
      {/each}
    </div>
    <h2 id={titleId} class="text-2xl font-black text-balance">{milestoneTitle(milestone)}</h2>
    <button class={[primaryButton, 'w-full text-lg']} onclick={() => dialog.close()}>{t('partyClose')}</button>
  </div>
</dialog>
