import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';

export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  markdown: {
    processor: unified({ remarkPlugins: [remarkGfm] }),
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
