<script>
  import CritterRow from './CritterRow.svelte';
  import { critters, isAvailableIn, MONTHS, TABS } from './critters.js';
  import { exportProgress, progress, setHemisphere } from './progress.svelte.js';

  let tab = $state('all');
  // 1–12, or 0 for all months.
  let month = $state(new Date().getMonth() + 1);

  const visible = $derived(
    critters.filter(
      (critter) =>
        (tab === 'all' || critter.type === tab) &&
        (month === 0 || isAvailableIn(critter, progress.hemisphere, month)),
    ),
  );
</script>

<div class="mx-auto max-w-6xl">
  <div class="sticky top-0 z-10 bg-amber-50">
    <header class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4">
      <h1 class="text-2xl font-bold">ACNH Critters</h1>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-stone-600">
          Hemisphere
          <select
            class="rounded-lg border border-stone-300 bg-white px-2 py-1 text-stone-800"
            value={progress.hemisphere}
            onchange={(event) => setHemisphere(event.currentTarget.value)}
          >
            <option value="north">Northern</option>
            <option value="south">Southern</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-stone-600">
          Month
          <select class="rounded-lg border border-stone-300 bg-white px-2 py-1 text-stone-800" bind:value={month}>
            <option value={0}>All months</option>
            {#each MONTHS as name, index (name)}
              <option value={index + 1}>{name}</option>
            {/each}
          </select>
        </label>

        <button
          class="rounded-full border-2 border-green-600 px-4 py-1 font-semibold text-green-700 hover:bg-green-100"
          onclick={exportProgress}
        >
          Export data
        </button>
      </div>
    </header>

    <div class="flex gap-1 overflow-x-auto border-b-2 border-stone-200 px-4" role="tablist">
      {#each TABS as { id, label } (id)}
        <button
          role="tab"
          aria-selected={tab === id}
          class={[
            '-mb-0.5 border-b-4 px-4 py-3 font-semibold whitespace-nowrap',
            tab === id ? 'border-green-600 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800',
          ]}
          onclick={() => (tab = id)}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  <ul>
    {#each visible as critter (critter.id)}
      <CritterRow {critter} hemisphere={progress.hemisphere} {month} />
    {:else}
      <li class="p-8 text-center text-stone-500">Nothing to catch here this month.</li>
    {/each}
  </ul>
</div>
