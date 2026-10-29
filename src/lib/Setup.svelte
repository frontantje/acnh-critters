<script>
  /** @type {{ ondone: () => void }} */
  let { ondone } = $props();
</script>

<!-- Placeholder until the setup flow is designed. -->
<main class="mx-4 mt-[12vh] max-w-md rounded-2xl bg-white p-8 text-center shadow-md sm:mx-auto">
  <h1 class="text-2xl font-bold">Initial setup</h1>
  <p class="mt-2 text-stone-600">Coming soon.</p>
  <button
    class="mt-8 rounded-full bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
    onclick={ondone}
  >
    Continue to the list
  </button>
</main>
