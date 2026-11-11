<script>
  import { medalOf, milestoneIcons } from './party.svelte.js';

  /** @type {{ milestone: import('./party.svelte.js').Milestone, size: number }} */
  let { milestone, size } = $props();

  const RAINBOW = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'];
  const stripes = RAINBOW.map((color, i) => `${color} ${(i * 100) / 6}% ${((i + 1) * 100) / 6}%`).join(', ');

  const METALS = {
    bronze: {
      rim: 'linear-gradient(135deg, #fde3cc, #7c3a14)',
      face: 'radial-gradient(circle at 35% 30%, #fff1e6, #e7a170 45%, #b5652f)',
      symbol: 'linear-gradient(135deg, #f8cfaa, #96501f)',
      ribbon: 'linear-gradient(90deg, #15803d 0 30%, #4ade80 30% 70%, #15803d 70%)',
    },
    silver: {
      rim: 'linear-gradient(135deg, #f8fafc, #64748b)',
      face: 'radial-gradient(circle at 35% 30%, #ffffff, #e2e8f0 45%, #a3b1c4)',
      symbol: 'linear-gradient(135deg, #e2e8f0, #8291a7)',
      ribbon: 'linear-gradient(90deg, #1d4ed8 0 30%, #60a5fa 30% 70%, #1d4ed8 70%)',
    },
    gold: {
      rim: 'linear-gradient(135deg, #fef3c7, #b45309)',
      face: 'radial-gradient(circle at 35% 30%, #fffbeb, #fcd34d 45%, #e59a1a)',
      symbol: 'linear-gradient(135deg, #fde68a, #c47a0c)',
      ribbon: 'linear-gradient(90deg, #b91c1c 0 30%, #f87171 30% 70%, #b91c1c 70%)',
    },
    rainbow: {
      rim: 'linear-gradient(135deg, #ffffff, #c4b5fd)',
      face: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.85), transparent 55%), conic-gradient(from 200deg, ${RAINBOW.join(', ')}, ${RAINBOW[0]})`,
      symbol: 'linear-gradient(135deg, #ffffff, #fae8ff)',
      ribbon: `linear-gradient(90deg, ${stripes})`,
    },
  };
  // Lit from the top left: a light edge above, a shadow below, so the symbols look raised.
  const EMBOSS = 'drop-shadow(-0.08em -0.08em 0 rgb(255 255 255 / 0.9)) drop-shadow(0.08em 0.1em 0.04em rgb(0 0 0 / 0.35))';
  // In % of the medal, since a sparkle's own font size would move it in em.
  const SPARKLES = [
    { left: '82%', top: '17%', size: '2.4em', delay: '0s' },
    { left: '-7%', top: '50%', size: '1.8em', delay: '0.6s' },
    { left: '81%', top: '82%', size: '1.6em', delay: '1.2s' },
  ];

  const medal = $derived(medalOf(milestone));
  const metal = $derived(METALS[medal]);
  const icons = $derived(milestoneIcons(milestone));

  /** @param {string} icon */
  const mask = (icon) => `mask: url('${icon}') center / contain no-repeat; -webkit-mask: url('${icon}') center / contain no-repeat`;

  /**
   * Three sit in a triangle, which fills the round face best.
   * @param {number} index
   */
  function place(index) {
    if (icons.length === 1) return 'inset: 0';
    const [left, top] = [[1.35, 0], [0, 2.7], [2.7, 2.7]][index];
    return `left: ${left}em; top: ${top}em; width: 3.3em; height: 3.3em`;
  }
</script>

<span class="relative inline-block h-[13em] w-[10em]" style:font-size="{size / 10}px" data-medal={medal} aria-hidden="true">
  <!-- The ribbon, behind the disc; the strap at the back is darker. -->
  <span
    class="absolute top-0 right-[1.7em] h-[7.8em] w-[3.3em] origin-top rotate-16"
    style:background="linear-gradient(rgb(0 0 0 / 0.2), rgb(0 0 0 / 0.2)), {metal.ribbon}"
  ></span>
  <span class="absolute top-0 left-[1.7em] h-[7.8em] w-[3.3em] origin-top -rotate-16" style:background={metal.ribbon}></span>

  <span class="absolute bottom-0 left-0 size-[10em] rounded-full shadow-[0_0.3em_0_rgb(0_0_0/0.18)]" style:background={metal.rim}>
    <span
      class="absolute inset-[0.7em] overflow-hidden rounded-full shadow-[inset_0.12em_0.15em_0.25em_rgb(0_0_0/0.3),inset_-0.1em_-0.1em_0.2em_rgb(255_255_255/0.6)]"
      style:background={metal.face}
    >
      <span class="absolute inset-[1.3em]" style:filter={EMBOSS}>
        {#if medal === 'bronze'}
          <!-- The month's number under its critters, so one month's medal tells apart from another's. -->
          <span class="flex h-full flex-col items-center justify-center gap-[0.2em]">
            <span class="flex h-[2.4em] gap-[0.2em]">
              {#each icons as icon (icon)}
                <span class="h-full w-[1.9em] only:w-[2.4em]" style={mask(icon)} style:background={metal.symbol} data-symbol></span>
              {/each}
            </span>
            <span class="bg-clip-text text-[3.2em] leading-none font-black text-transparent" style:background-image={metal.symbol} data-month
              >{milestone.month}</span
            >
          </span>
        {:else}
          {#each icons as icon, index (icon)}
            <span class="absolute" style="{place(index)}; {mask(icon)}" style:background={metal.symbol} data-symbol></span>
          {/each}
        {/if}
      </span>
      {#if medal === 'rainbow'}
        <span
          class="absolute inset-0 bg-size-[300%_100%] motion-safe:animate-medal-shine"
          style:background-image="linear-gradient(115deg, transparent 38%, rgb(255 255 255 / 0.9) 47%, rgb(255 255 255 / 0.9) 53%, transparent 62%)"
        ></span>
      {/if}
    </span>
  </span>

  {#if medal === 'rainbow'}
    {#each SPARKLES as sparkle (sparkle.delay)}
      <span
        class="absolute leading-none text-white [text-shadow:0_0_0.25em_#e879f9] motion-safe:animate-medal-twinkle"
        style:left={sparkle.left}
        style:top={sparkle.top}
        style:font-size={sparkle.size}
        style:animation-delay={sparkle.delay}>✦</span
      >
    {/each}
  {/if}
</span>
