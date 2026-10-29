<script>
  import { t } from './i18n.svelte.js';
  import { progress, setName, transferCode } from './progress.svelte.js';
  import { MAX_NAME_LENGTH, normalizeName } from './transfer.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  /** @type {HTMLDialogElement} */
  let dialog;
  $effect(() => dialog.showModal());

  let name = $state(progress.name);
  const code = $derived(transferCode(name));
  const subject = $derived(normalizeName(name) ? t('exportSubjectNamed', { name: normalizeName(name) }) : t('exportSubject'));
  const message = $derived(t('exportMessage', { import: t('importData'), code }));
  // Mail links want CRLF line breaks.
  const emailHref = $derived(
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replace(/\n/g, '\r\n'))}`,
  );

  // The share menu (Web Share API) is how a web page reaches AirDrop, Mail and
  // messengers. iPadOS reports itself as a Mac.
  const canShare = navigator.canShare?.({ text: 'ACNH' }) ?? typeof navigator.share === 'function';
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

  let copied = $state(false);
  let error = $state('');

  // The name is only remembered (and shown in the menu) once it was exported.
  function exported() {
    setName(name);
  }

  async function copy() {
    error = '';
    try {
      await navigator.clipboard.writeText(code);
      exported();
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      error = t('exportCopyFailed');
    }
  }

  async function share() {
    error = '';
    try {
      await navigator.share({ title: subject, text: message });
      exported();
    } catch (e) {
      // Closing the share menu without picking anything isn't an error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) error = t('exportShareFailed');
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([message.replace(/\n/g, '\r\n')], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `acnh-critters-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    exported();
  }

  const optionClass =
    'flex min-h-12 w-full items-center justify-center rounded-full border-2 border-green-600 bg-white px-4 py-2 font-bold text-green-700 hover:bg-green-50';
</script>

<dialog
  bind:this={dialog}
  {onclose}
  aria-labelledby="export-title"
  class="m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl bg-amber-50 p-0 text-stone-800 shadow-xl backdrop:bg-stone-900/40"
>
  <div class="p-5">
    <div class="flex items-start justify-between gap-4">
      <h2 id="export-title" class="pt-2 text-xl font-bold">{t('exportData')}</h2>
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
    <p class="mt-1 text-stone-600">{t('exportIntro')}</p>

    <label class="mt-5 block font-semibold">
      {t('exportNameLabel')}
      <input
        class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
        maxlength={MAX_NAME_LENGTH}
        autocomplete="nickname"
        aria-describedby="export-name-hint"
        bind:value={name}
      />
    </label>
    <p id="export-name-hint" class="mt-1 text-sm text-stone-500">{t('exportNameHint')}</p>

    <p class="mt-5 font-semibold" id="export-code-label">{t('exportCodeLabel')}</p>
    <output
      class="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm break-all select-all"
      aria-labelledby="export-code-label"
    >
      {code}
    </output>

    <div class="mt-4 grid gap-3">
      <button
        class="flex min-h-12 w-full items-center justify-center rounded-full border-2 border-green-600 bg-green-600 px-4 py-2 font-bold text-white hover:border-green-700 hover:bg-green-700"
        onclick={copy}
      >
        <!-- Announced when it changes to "Copied!". -->
        <span aria-live="polite">{copied ? t('exportCopied') : t('exportCopy')}</span>
      </button>
      {#if canShare}
        <button class={optionClass} onclick={share}>{isApple ? t('exportShareApple') : t('exportShare')}</button>
      {/if}
      <a class={optionClass} href={emailHref} onclick={exported}>{t('exportEmail')}</a>
      <button class={optionClass} onclick={download}>{t('exportDownload')}</button>
    </div>

    {#if error}
      <p class="mt-4 text-red-700" role="alert">{error}</p>
    {/if}
  </div>
</dialog>
