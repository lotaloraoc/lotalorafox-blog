import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://lotalorafox.com',
  output: 'static',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeRaw, rehypeKatex],
    }),
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
