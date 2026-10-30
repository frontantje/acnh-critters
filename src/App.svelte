<script>
  import CritterpediaSync from './lib/CritterpediaSync.svelte';
  import ExportDialog from './lib/ExportDialog.svelte';
  import ImportDialog from './lib/ImportDialog.svelte';
  import MainView from './lib/MainView.svelte';
  import ProfileDialog from './lib/ProfileDialog.svelte';
  import Welcome from './lib/Welcome.svelte';
  import { cancelNewProfile, previousProfile, profileName, profiles, restore, save } from './lib/progress.svelte.js';

  restore();
  // A profile that hasn't been saved yet starts on the welcome screen: on the
  // first visit, after adding a profile, and after deleting the last one.
  // Leaving it in any way saves the profile, so it isn't shown again.
  const showWelcome = $derived(profiles.active === null);
  // A new profile's welcome screen also leads back to the profile before.
  const backTo = $derived.by(() => {
    const previous = previousProfile();
    return previous ? profileName(previous) : null;
  });
  let syncing = $state(false);
  let exporting = $state(false);
  /** null: closed; 'new' from the welcome screen; 'replace' over existing progress. */
  let importMode = $state(/** @type {null | 'new' | 'replace'} */ (null));
  /** null: closed; 'add' for a new profile; 'edit' to rename or delete the one shown. */
  let profileMode = $state(/** @type {null | 'add' | 'edit'} */ (null));
</script>

{#if showWelcome}
  <Welcome
    onimport={() => (importMode = 'new')}
    onsync={() => {
      save();
      syncing = true;
    }}
    onskip={save}
    {backTo}
    onback={cancelNewProfile}
  />
{:else}
  <MainView
    onsync={() => (syncing = true)}
    onexport={() => (exporting = true)}
    onimport={() => (importMode = 'replace')}
    onaddprofile={() => (profileMode = 'add')}
    oneditprofile={() => (profileMode = 'edit')}
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
  <ImportDialog replacing={importMode === 'replace'} onclose={() => (importMode = null)} />
{/if}
{#if profileMode}
  <ProfileDialog adding={profileMode === 'add'} onclose={() => (profileMode = null)} />
{/if}
