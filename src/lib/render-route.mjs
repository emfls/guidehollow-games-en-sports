import { renderPage } from '../../shared/render.mjs';
import { siteGames } from '../../scripts/build-context.mjs';

export function renderRoute(entry, data) {
  return renderPage({
    site: entry.site,
    sites: data.allSites,
    games: siteGames(entry.site, data),
    page: entry.type,
    game: entry.game,
    verification: data.verification,
  });
}
