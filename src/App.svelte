<script>
  import MainView from './lib/MainView.svelte';
  import Setup from './lib/Setup.svelte';
  import Welcome from './lib/Welcome.svelte';
  import { restore, save } from './lib/progress.svelte.js';

  /** @type {'welcome' | 'setup' | 'main'} */
  let screen = $state(restore() ? 'main' : 'welcome');

  // Saving here means the welcome screen isn't shown again, even when the
  // player skipped it.
  function showMain() {
    save();
    screen = 'main';
  }
</script>

{#if screen === 'welcome'}
  <Welcome onimport={showMain} onsetup={() => (screen = 'setup')} onskip={showMain} />
{:else if screen === 'setup'}
  <Setup ondone={showMain} />
{:else}
  <MainView />
{/if}
