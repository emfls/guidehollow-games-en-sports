import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { loadBuildData, localePrefix, publicPageEntries, rootDir, xmlEscape } from './build-context.mjs';
import { renderFavicon } from '../shared/render.mjs';

const data = loadBuildData();
const publicDir = resolve(rootDir, '.generated/public');
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

const favicon = `${renderFavicon(data.sites[0])}\n`;

for (const site of data.sites) {
  const prefix = localePrefix(site);
  for (const file of ['site.css', 'site.js']) {
    const target = resolve(publicDir, prefix, 'assets', file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(rootDir, 'shared', file), target);
  }
  await writeFile(resolve(publicDir, prefix, 'favicon.svg'), favicon);
  await writeFile(resolve(publicDir, `${site.indexNowKey}.txt`), site.indexNowKey);
}

const entries = publicPageEntries(data);
const counterparts = publicPageEntries({ ...data, sites: data.allSites.filter(site => site.genre === data.genre) });
const locationFor = entry => new URL(entry.path ? `${entry.path}/` : './', entry.site.baseUrl).href;
function sitemap(selectedEntries) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    selectedEntries.map(entry => {
      const alternates = counterparts.filter(other => other.type === entry.type && (entry.type !== 'game' || (other.game?.id === entry.game.id && other.site.gameIds.includes(entry.game.id))));
      const english = alternates.find(other => other.site.locale === 'en');
      return `  <url><loc>${xmlEscape(locationFor(entry))}</loc>` +
        alternates.map(other => `<xhtml:link rel="alternate" hreflang="${other.site.locale}" href="${xmlEscape(locationFor(other))}"/>`).join('') +
        (english ? `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(locationFor(english))}"/>` : '') +
        '</url>';
    }).join('\n') + '\n</urlset>\n';
}

await writeFile(resolve(publicDir, 'sitemap.xml'), sitemap(entries));
await writeFile(resolve(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${data.origin}/sitemap.xml\n`);
await writeFile(resolve(publicDir, '.nojekyll'), '');
await writeFile(resolve(publicDir, 'CNAME'), `${new URL(data.origin).hostname}\n`);
console.log(`Prepared ${data.locale}-${data.genre} assets and a sitemap for ${entries.length} pages.`);
