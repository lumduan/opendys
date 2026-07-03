import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  // Accessible pastel themes for visual comfort (see ADR-0002).
  daisyui: {
    themes: ['cupcake', 'pastel'],
    logs: false,
  },
};
