/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        healthy: '#10b981',
        'at-risk': '#f59e0b',
        'needs-attention': '#ef4444',
        'insufficient-data': '#6b7280',
      },
    },
  },
  plugins: [],
};
