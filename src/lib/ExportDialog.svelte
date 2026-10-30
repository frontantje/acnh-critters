<script>
  import Dialog from './Dialog.svelte';
  import { t } from './i18n.svelte.js';
  import NameField from './NameField.svelte';
  import { progress, setName, takenName, transferCode } from './progress.svelte.js';
  import { primaryButton } from './styles.js';
  import { normalizeName } from './transfer.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  let name = $state(progress.name);
  // Exporting renames the profile, and no two profiles share a name.
  const taken = $derived(takenName(name));
  const code = $derived(transferCode(name));
  const subject = $derived(normalizeName(name) ? t('exportSubjectNamed', { name: normalizeName(name) }) : t('exportSubject'));
  const message = $derived(t('exportMessage', { import: t('importData'), code }));
  // Mail links want CRLF line breaks.
  const emailHref = $derived(
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replace(/\n/g, '\r\n'))}`,
  );

  const canShare = navigator.canShare?.({ text: 'ACNH' }) ?? typeof navigator.share === 'function';
  // Macintosh too, since iPadOS reports itself as a Mac.
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
    'flex min-h-12 w-full items-center justify-center rounded-full border-2 border-green-600 bg-white px-4 py-2 font-bold text-green-700 hover:bg-green-50 disabled:opacity-50';
</script>

<Dialog title={t('exportData')} {onclose}>
  <p class="mt-1 text-stone-600">{t('exportIntro')}</p>

  <div class="mt-5">
    <NameField bind:value={name} label={t('exportNameLabel')} hint={t('exportNameHint')} {taken} autocomplete="nickname" />
  </div>

  <p class="mt-5 font-semibold" id="export-code-label">{t('exportCodeLabel')}</p>
  <output
    class="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm break-all select-all"
    aria-labelledby="export-code-label"
  >
    {code}
  </output>

  <!-- Off while the name is taken; a link can't be disabled, but without an href it's plain text to screen readers too. -->
  <div class="mt-4 grid gap-3">
    <button class={[primaryButton, 'flex w-full items-center justify-center']} disabled={!!taken} onclick={copy}>
      <!-- Announced when it changes to "Copied!". -->
      <span aria-live="polite">{copied ? t('exportCopied') : t('exportCopy')}</span>
    </button>
    {#if canShare}
      <button class={optionClass} disabled={!!taken} onclick={share}>{isApple ? t('exportShareApple') : t('exportShare')}</button>
    {/if}
    <a class={[optionClass, taken && 'opacity-50']} href={taken ? undefined : emailHref} onclick={exported}>{t('exportEmail')}</a>
    <button class={optionClass} disabled={!!taken} onclick={download}>{t('exportDownload')}</button>
  </div>

  {#if error}
    <p class="mt-4 text-red-700" role="alert">{error}</p>
  {/if}
</Dialog>
