import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// npm and Astro run with the project root as their working directory. Keeping
// this independent of import.meta.url also works in Astro's bundled renderer.
export const rootDir = process.cwd();
export const supportedGenres = ['puzzle', 'racing', 'sports', 'arcade'];
export const supportedLocales = ['en', 'ko', 'ja'];
export const publisherClid = 'p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92';

function readJson(file) {
  return JSON.parse(readFileSync(resolve(rootDir, file), 'utf8'));
}

export function getDeployment() {
  const file = resolve(rootDir, 'deployment.json');
  const saved = existsSync(file) ? readJson('deployment.json') : {};
  const genre = process.env.SITE_GENRE || saved.genre || 'puzzle';
  const locale = process.env.SITE_LOCALE || saved.locale || 'en';
  if (!supportedGenres.includes(genre)) {
    throw new Error(`Unsupported SITE_GENRE: ${genre}. Choose ${supportedGenres.join(', ')}.`);
  }
  if (!supportedLocales.includes(locale)) {
    throw new Error(`Unsupported SITE_LOCALE: ${locale}. Choose ${supportedLocales.join(', ')}.`);
  }
  return {
    genre,
    locale,
    origin: `https://${locale}-${genre}.guidehollow.com`,
    outDir: resolve(rootDir, process.env.OUTPUT_DIR || 'dist'),
  };
}

export function loadBuildData() {
  const deployment = getDeployment();
  const configuredSites = readJson('data/sites.json');
  const catalog = readJson('data/catalog.json');
  if (!Array.isArray(configuredSites) || !Array.isArray(catalog)) {
    throw new Error('data/sites.json and data/catalog.json must contain arrays.');
  }
  if (new Set(configuredSites.map(site => site.id)).size !== configuredSites.length) {
    throw new Error('Duplicate site IDs in data/sites.json.');
  }
  // Only published/active sites participate in navigation and hreflang links.
  const allSites = configuredSites.filter(site => site.active !== false);
  const sites = allSites.filter(site => site.genre === deployment.genre && site.locale === deployment.locale);
  if (sites.length !== 1) {
    throw new Error(`Expected one ${deployment.genre}/${deployment.locale} site in data/sites.json.`);
  }
  const gamesById = new Map(catalog.map(game => [game.id, game]));
  if (gamesById.size !== catalog.length) throw new Error('Duplicate game IDs in catalog.');
  for (const site of sites) {
    const address = new URL(site.baseUrl);
    if (address.origin !== deployment.origin || address.pathname !== '/') {
      throw new Error(`Unexpected baseUrl for ${site.id}: ${site.baseUrl}`);
    }
    if (!Array.isArray(site.gameIds) || !site.gameIds.length) {
      throw new Error(`No games selected for ${site.id}.`);
    }
    if (new Set(site.gameIds).size !== site.gameIds.length) {
      throw new Error(`Duplicate selected game IDs in ${site.id}.`);
    }
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(site.indexNowKey || '')) {
      throw new Error(`Missing or invalid public IndexNow key for ${site.id}.`);
    }
    for (const id of site.gameIds) {
      if (!gamesById.has(id)) throw new Error(`${site.id} references unknown game ${id}.`);
      if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid game route slug: ${id}.`);
      const game = gamesById.get(id);
      const nativeLanguages = (game.languages || []).map(language => String(language).replaceAll('_', '-').split('-')[0].toLowerCase());
      if (!nativeLanguages.includes(site.locale)) {
        throw new Error(`${site.id} includes ${id}, which does not list native ${site.locale} support.`);
      }
      for (const key of ['embedUrl', 'affiliateUrl']) {
        const url = new URL(game[key]);
        if (url.protocol !== 'https:') throw new Error(`${id}/${key} must use HTTPS.`);
        const attribution = url.searchParams.getAll('clid');
        if (attribution.length !== 1 || attribution[0] !== publisherClid) {
          throw new Error(`${id}/${key} must retain exactly one publisher CLID.`);
        }
      }
    }
  }
  const verificationFile = resolve(rootDir, 'data/verification.json');
  const verification = existsSync(verificationFile) ? readJson('data/verification.json') : {};
  return { ...deployment, allSites, configuredSites, sites, catalog, gamesById, verification };
}

export function localePrefix(site) {
  return '';
}

export function siteGames(site, data = loadBuildData()) {
  return site.gameIds.map(id => data.gamesById.get(id));
}

export function publicPageEntries(data = loadBuildData()) {
  return data.sites.flatMap(site => {
    const prefix = localePrefix(site);
    return [
      { site, type: 'home', path: prefix.replace(/\/$/, '') || undefined, file: `${prefix}index.html` },
      { site, type: 'about', path: `${prefix}about`, file: `${prefix}about/index.html` },
      { site, type: 'privacy', path: `${prefix}privacy`, file: `${prefix}privacy/index.html` },
      ...site.gameIds.map(id => ({ site, type: 'game', game: data.gamesById.get(id), path: `${prefix}games/${id}`, file: `${prefix}games/${id}/index.html` })),
    ];
  });
}

export function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
