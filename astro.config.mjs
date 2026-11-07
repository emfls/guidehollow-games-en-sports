import { defineConfig } from 'astro/config';
import { getDeployment } from './scripts/build-context.mjs';

const deployment = getDeployment();

export default defineConfig({
  site: deployment.origin,
  output: 'static',
  outDir: deployment.outDir,
  publicDir: './.generated/public',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
});
