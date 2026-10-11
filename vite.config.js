import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes every asset path relative, so the built site works from
// GitHub Pages (any repo name), Netlify, Vercel, or a plain folder without
// editing this file.
export default defineConfig({
  plugins: [react()],
  base: '/astereats/',
});
