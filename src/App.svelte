<script>
  import CritterpediaSync from './lib/CritterpediaSync.svelte';
  import ExportDialog from './lib/ExportDialog.svelte';
  import ImportDialog from './lib/ImportDialog.svelte';
  import MainView from './lib/MainView.svelte';
  import PartyPopup from './lib/PartyPopup.svelte';
  import ProfileDialog from './lib/ProfileDialog.svelte';
  import TrophyCase from './lib/TrophyCase.svelte';
  import Welcome from './lib/Welcome.svelte';
  import { awardTrophies, party } from './lib/party.svelte.js';
  import { cancelNewProfile, previousProfile, profileName, profiles, restore, save } from './lib/progress.svelte.js';

  restore();
  // A new profile stays unsaved (profiles.active null) until its welcome screen is left.
  const showWelcome = $derived(profiles.active === null);
  const backTo = $derived.by(() => {
    const previous = previousProfile();
    return previous ? profileName(previous) : null;
  });
  let syncing = $state(false);
  let exporting = $state(false);
  let importMode = $state(/** @type {null | 'new' | 'replace'} */ (null));
  let profileMode = $state(/** @type {null | 'add' | 'edit'} */ (null));
  let showingTrophies = $state(false);

  // Also right at the start, for milestones reached before there were trophies.
  $effect(() => {
    if (!showWelcome) awardTrophies();
  });
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
    ontrophies={() => (showingTrophies = true)}
  />
{/if}

<!-- Opened over the main view, so it keeps its tab, filters and scroll position. -->
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
{#if showingTrophies}
  <TrophyCase onclose={() => (showingTrophies = false)} />
{/if}
{#if party.queue.length}
  <!-- A new popup for each, so each opens with its own confetti. -->
  {#key party.queue[0]}
    <PartyPopup milestone={party.queue[0]} onclose={() => party.queue.shift()} />
  {/key}
{/if}
