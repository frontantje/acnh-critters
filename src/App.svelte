<script>
  import CritterpediaSync from './lib/CritterpediaSync.svelte';
  import ExportDialog from './lib/ExportDialog.svelte';
  import ImportDialog from './lib/ImportDialog.svelte';
  import MainView from './lib/MainView.svelte';
  import Welcome from './lib/Welcome.svelte';
  import { restore, save } from './lib/progress.svelte.js';

  let showWelcome = $state(!restore());
  let syncing = $state(false);
  let exporting = $state(false);
  /** null: closed; 'new' from the welcome screen; 'replace' over existing progress. */
  let importMode = $state(/** @type {null | 'new' | 'replace'} */ (null));

  // Saving here means the welcome screen isn't shown again, even when the
  // player skipped it.
  function leaveWelcome() {
    save();
    showWelcome = false;
  }
</script>

{#if showWelcome}
  <Welcome
    onimport={() => (importMode = 'new')}
    onsync={() => {
      leaveWelcome();
      syncing = true;
    }}
    onskip={leaveWelcome}
  />
{:else}
  <MainView
    onsync={() => (syncing = true)}
    onexport={() => (exporting = true)}
    onimport={() => (importMode = 'replace')}
  />
{/if}

<!-- These open over the main view, which keeps its tab, filters and scroll position. -->
{#if syncing}
  <CritterpediaSync onexit={() => (syncing = false)} />
{/if}
{#if exporting}
  <ExportDialog onclose={() => (exporting = false)} />
{/if}
{#if importMode}
  <ImportDialog
    replacing={importMode === 'replace'}
    onimported={() => showWelcome && leaveWelcome()}
    onclose={() => (importMode = null)}
  />
{/if}
