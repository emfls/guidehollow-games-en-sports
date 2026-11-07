import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadBuildData, publicPageEntries, publisherClid } from './build-context.mjs';

const data = loadBuildData();
const entries = publicPageEntries(data);
const failures = [];
for (const entry of entries) {
  let html;
  try {
    html = await readFile(resolve(data.outDir, entry.file), 'utf8');
  } catch {
    failures.push(`Missing generated page: ${entry.file}`);
    continue;
  }
  const expectedUrl = new URL(entry.path ? `${entry.path}/` : '/', `${data.origin}/`).href;
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].find(([tag]) => /rel=["']canonical["']/.test(tag))?.[0];
  if (!canonical?.includes(`href="${expectedUrl}"`) && !canonical?.includes(`href='${expectedUrl}'`)) {
    failures.push(`Canonical mismatch: ${entry.file}`);
  }
  if (!new RegExp(`<html\\b[^>]*lang=["']${entry.site.locale}["']`).test(html)) {
    failures.push(`HTML language mismatch: ${entry.file}`);
  }
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`Missing title: ${entry.file}`);
  if (!/<meta\b[^>]*name=["']description["'][^>]*>/.test(html)) failures.push(`Missing description: ${entry.file}`);
  if (/<iframe\b/i.test(html)) failures.push(`Game iframe loads before the Play action: ${entry.file}`);
  if (entry.type === 'game') {
    for (const key of ['embedUrl', 'affiliateUrl']) {
      if (new URL(entry.game[key]).searchParams.get('clid') !== publisherClid) failures.push(`Missing publisher CLID: ${entry.game.id}/${key}`);
    }
    if (!html.includes('VideoGame')) failures.push(`Missing game schema: ${entry.file}`);
    if (!html.includes('BreadcrumbList')) failures.push(`Missing breadcrumb schema: ${entry.file}`);
  }
}
for (const file of ['sitemap.xml', 'robots.txt', '404.html', 'assets/site.css', 'assets/site.js']) {
  try { await access(resolve(data.outDir, file)); }
  catch { failures.push(`Missing deployment file: ${file}`); }
}
const sitemap = await readFile(resolve(data.outDir, 'sitemap.xml'), 'utf8').catch(() => '');
const count = [...sitemap.matchAll(/<loc>/g)].length;
if (count !== entries.length) failures.push(`Sitemap has ${count} URLs; expected ${entries.length}.`);
for (const site of data.sites) {
  const keyText = await readFile(resolve(data.outDir, `${site.indexNowKey}.txt`), 'utf8').catch(() => '');
  if (keyText !== site.indexNowKey) failures.push(`Missing or incorrect IndexNow key file for ${site.id}.`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${entries.length} static pages for ${data.locale}-${data.genre}: routes, languages, metadata, sitemap, schema and publisher links.`);
}
