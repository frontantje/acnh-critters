<script>
  import { t } from './i18n.svelte.js';
  import { MAX_NAME_LENGTH } from './transfer.js';

  /**
   * A field for a profile's name, with a hint below it that turns into an
   * error while another profile goes by the name (see takenName).
   * @type {{
   *   value: string,
   *   label: string,
   *   hint: string,
   *   taken: string | null,
   *   autocomplete?: import('svelte/elements').HTMLInputAttributes['autocomplete'],
   *   autofocus?: boolean,
   * }}
   */
  let { value = $bindable(), label, hint, taken, autocomplete = 'off', autofocus = false } = $props();

  const hintId = $props.id();
</script>

<div>
  <label class="block font-semibold">
    {label}
    <!-- In a dialog, where showModal() moves focus to it. -->
    <!-- svelte-ignore a11y_autofocus -->
    <input
      class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
      maxlength={MAX_NAME_LENGTH}
      {autocomplete}
      {autofocus}
      aria-describedby={hintId}
      aria-invalid={!!taken}
      bind:value
    />
  </label>
  {#if taken}
    <p id={hintId} class="mt-1 text-sm font-semibold text-red-700">{t('profileNameTaken', { name: taken })}</p>
  {:else}
    <p id={hintId} class="mt-1 text-sm text-stone-500">{hint}</p>
  {/if}
</div>
