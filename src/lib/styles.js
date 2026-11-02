// A darker bottom edge and a small dip when pressed, like the game's chunky buttons.
const press = 'active:translate-y-0.5 disabled:translate-y-0 disabled:shadow-none';

export const primaryButton = `min-h-12 rounded-full border-2 border-green-600 bg-green-600 px-4 py-2 font-extrabold text-white shadow-[0_4px_0_var(--color-green-800)] hover:border-green-700 hover:bg-green-700 active:shadow-[0_2px_0_var(--color-green-800)] disabled:opacity-50 ${press}`;

export const secondaryButton = `min-h-12 rounded-full border-2 border-green-600 bg-white px-4 py-2 font-extrabold text-green-700 shadow-[0_4px_0_var(--color-green-100)] hover:bg-green-50 active:shadow-[0_2px_0_var(--color-green-100)] disabled:opacity-50 ${press}`;

export const plainButton = `min-h-12 rounded-full border-2 border-stone-300 bg-white px-4 py-2 font-extrabold text-stone-700 shadow-[0_4px_0_var(--color-stone-200)] hover:bg-stone-100 active:shadow-[0_2px_0_var(--color-stone-200)] ${press}`;

export const dangerButton = `min-h-12 rounded-full border-2 border-red-600 bg-red-600 px-4 py-2 font-extrabold text-white shadow-[0_4px_0_var(--color-red-800)] hover:border-red-700 hover:bg-red-700 active:shadow-[0_2px_0_var(--color-red-800)] ${press}`;
