<script>
  import { t } from './i18n.svelte.js';

  /** @type {{ onimport: () => void, onsync: () => void, onskip: () => void }} */
  let { onimport, onsync, onskip } = $props();
</script>

<main class="mx-4 mt-[12vh] max-w-md rounded-2xl bg-white p-8 text-center shadow-md sm:mx-auto">
  <h1 class="text-2xl font-bold">{t('welcomeTitle')}</h1>
  <p class="mt-2 text-stone-600">{t('welcomeIntro')}</p>

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
</main>
