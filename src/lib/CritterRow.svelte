<script>
  import { locationText, notesText, timeText } from './critters.js';
  import { progress, toggleCaught } from './progress.svelte.js';

  /**
   * @type {{
   *   critter: import('./critters.js').Critter,
   *   hemisphere: import('./critters.js').Hemisphere,
   *   month: number,
   * }}
   */
  let { critter, hemisphere, month } = $props();

  const caught = $derived(progress.caught.has(critter.id));
</script>

<!-- Phones: icon on the left, details stacked, full-width button below.
     md and up: everything in one row. -->
<li
  class={[
    'grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-0.5 border-b border-stone-200 px-4 py-3',
    'md:grid-cols-[4rem_1fr_1.5fr_1fr_1fr_auto] md:gap-x-4',
    caught ? 'bg-green-50' : 'bg-white',
  ]}
>
  <img
    class="row-span-4 size-14 self-start object-contain md:row-span-1 md:size-16 md:self-center"
    src={critter.icon}
    alt=""
    width="64"
    height="64"
    loading="lazy"
  />
  <span class="font-bold">{critter.name}</span>
  <span>{locationText(critter)}</span>
  <span>{timeText(critter, hemisphere, month)}</span>
  <span class="text-sm text-stone-500">{notesText(critter)}</span>
  <button
    class={[
      'col-span-2 mt-2 rounded-full border-2 px-6 py-3 text-lg font-bold whitespace-nowrap md:col-span-1 md:mt-0',
      caught
        ? 'border-green-600 bg-white text-green-700 hover:bg-green-100'
        : 'border-green-600 bg-green-600 text-white hover:border-green-700 hover:bg-green-700',
    ]}
    onclick={() => toggleCaught(critter.id)}
  >
    {caught ? 'Caught ✓' : 'Caught it'}
  </button>
</li>
