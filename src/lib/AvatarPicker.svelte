<script>
  import { untrack } from 'svelte';
  import { avatarChoices } from './avatars.js';
  import { critterName } from './critters.js';
  import { t } from './i18n.svelte.js';
  import { avatarAllowed } from './progress.svelte.js';

  /** @type {{ value: string | null, id: number | null }} */
  let { value = $bindable(), id } = $props();

  const group = $props.id();
  // Drawn once per open, so the tiles don't change while picking.
  const choices = untrack(() => avatarChoices(value, (critter) => avatarAllowed(critter, id)));
  if (untrack(() => value) === null) value = choices[0]?.id ?? null;
</script>

<!-- Real radio buttons, so arrow keys and screen readers work as for any choice. -->
<fieldset>
  <legend class="font-semibold">{t('avatarLabel')}</legend>
  <div class="mt-2 grid grid-cols-4 gap-2">
    {#each choices as critter (critter.id)}
      <label
        class="relative grid aspect-square place-items-center rounded-2xl border-2 border-stone-200 bg-white hover:border-green-400 has-checked:border-green-600 has-checked:bg-green-50 has-focus-visible:ring-4 has-focus-visible:ring-green-300"
      >
        <!-- An invisible radio over the whole tile, so a tap anywhere picks it. -->
        <input
          class="absolute inset-0 cursor-pointer appearance-none rounded-2xl outline-none"
          type="radio"
          name={group}
          value={critter.id}
          bind:group={value}
        />
        <img class="size-12 object-contain" src={critter.icon} alt={critterName(critter)} width="48" height="48" />
      </label>
    {/each}
  </div>
</fieldset>
