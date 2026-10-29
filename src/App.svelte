<script>
  import CritterpediaSync from './lib/CritterpediaSync.svelte';
  import MainView from './lib/MainView.svelte';
  import Welcome from './lib/Welcome.svelte';
  import { restore, save } from './lib/progress.svelte.js';

  let showWelcome = $state(!restore());
  let syncing = $state(false);

  // Saving here means the welcome screen isn't shown again, even when the
  // player skipped it.
  function leaveWelcome() {
    save();
    showWelcome = false;
  }
</script>

{#if showWelcome}
  <Welcome
    onimport={leaveWelcome}
    onsync={() => {
      leaveWelcome();
      syncing = true;
    }}
    onskip={leaveWelcome}
  />
{:else}
  <MainView onsync={() => (syncing = true)} />
{/if}

<!-- Opens over the main view, which keeps its tab, filters and scroll position. -->
{#if syncing}
  <CritterpediaSync onexit={() => (syncing = false)} />
{/if}
