import { getCopy, interpolate, genreNames, categoryLabel, localizedGame, languageLabel } from './i18n.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const asText = value => Array.isArray(value) ? value.join('\n') : String(value || '');
const excerpt = (value, max = 160) => { const text = asText(value).replace(/\s+/g, ' ').trim(); if (text.length <= max) return text; return `${text.slice(0,max - 1).replace(/\s+\S*$/, '')}…`; };
const paragraphs = value => asText(value).split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
const iconPaths = {
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  search:'<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16 16 5 5"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  play:'<path d="m9 5 11 7-11 7Z"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  full:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  external:'<path d="M14 3h7v7m0-7L10 14m-1-9H3v16h16v-6"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>'
};
const icon = name => `<svg aria-hidden="true" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.sparkle}</svg>`;
const pathFor = (page, game) => page === 'home' ? '' : page === 'game' ? `games/${encodeURIComponent(game.id)}/` : page === '404' ? '404.html' : `${page}/`;
const absolute = (site, path = '') => new URL(path, site.baseUrl.endsWith('/') ? site.baseUrl : `${site.baseUrl}/`).href;
const gamePath = (ctx, game) => `${ctx.root}games/${encodeURIComponent(game.id)}/`;

function context(options) {
  const site = options.site;
  if (!site?.baseUrl || !site?.id) throw new Error('renderPage requires a site with id and baseUrl');
  const locale = site.locale || 'en';
  const source = options.games instanceof Map ? [...options.games.values()] : options.games || [];
  const byId = new Map(source.map(game => [game.id, game]));
  const games = (site.gameIds || source.map(game => game.id)).map(id => byId.get(id)).filter(Boolean).map(game => localizedGame(game, locale));
  const rawGame = typeof options.game === 'string' ? byId.get(options.game) : options.game;
  const game = rawGame ? localizedGame(rawGame, locale) : undefined;
  const page = options.page || 'home';
  const root = page === 'game' ? '../../' : ['about','privacy'].includes(page) ? '../' : page === '404' ? site.baseUrl : './';
  return { ...options, site, locale, games, game, page, root, copy: getCopy(locale), genre: genreNames[locale]?.[site.genre] || site.genreLabel || categoryLabel(site.genre, locale), sites: (options.sites || [site]).filter(candidate => candidate.active !== false) };
}

function imageMarkup(game, ctx, { eager = false, large = false } = {}) {
  let srcset = '';
  try { const source = new URL(game.thumbnail); if (source.hostname === 'static.playgama.com') srcset = [320,480,720,1100].map(width => { const image = new URL(source); image.searchParams.set('width',String(width)); return `${esc(image.href)} ${width}w`; }).join(', '); } catch {}
  return `<span class="game-art"><span class="image-fallback" aria-hidden="true">${icon('image')}<span>${esc(ctx.copy.thumbnailUnavailable)}</span></span><img src="${esc(game.thumbnail)}"${srcset ? ` srcset="${srcset}" sizes="${large ? '(max-width: 700px) 94vw, 65vw' : '(max-width: 560px) 46vw, (max-width: 900px) 31vw, 280px'}"` : ''} alt="${esc(game.title)}" width="720" height="480" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" data-game-image></span>`;
}

function favorite(game, ctx, extra = '') {
  return `<button class="favorite-button ${extra}" type="button" data-favorite="${esc(game.id)}" data-title="${esc(game.title)}" aria-pressed="false" aria-label="${esc(interpolate(ctx.copy.saveTitle,{title:game.title}))}">${icon('heart')}<span class="favorite-text">${esc(ctx.copy.save)}</span></button>`;
}

function card(game, ctx, index = 0, extra = '') {
  const category = game.categories?.find(name => name !== ctx.site.genre) || ctx.site.genre;
  return `<article class="game-card ${extra}" data-card="${esc(game.id)}" data-order="${index}"><a class="card-link" href="${gamePath(ctx,game)}">${imageMarkup(game,ctx)}<div class="card-copy"><span class="eyebrow">${esc(categoryLabel(category,ctx.locale))}</span><h3>${esc(game.title)}</h3><span class="card-action">${esc(ctx.copy.view)} ${icon('arrow')}</span></div></a>${favorite(game,ctx)}</article>`;
}

function genreMenu(ctx) {
  const available = ctx.sites.filter(site => site.locale === ctx.locale);
  if (available.length < 2) return '';
  const label = {en:'Genres',ko:'장르',ja:'ジャンル'}[ctx.locale] || 'Genres';
  const navigation = {en:'Game genres',ko:'게임 장르',ja:'ゲームジャンル'}[ctx.locale] || 'Game genres';
  return `<details class="genre-menu" data-genre-menu><summary>${esc(label)}<span aria-hidden="true">▾</span></summary><nav class="genre-menu-panel" aria-label="${esc(navigation)}">${available.map(site => `<a href="${esc(site.baseUrl)}"${site.id === ctx.site.id ? ' aria-current="true"' : ''}>${esc(genreNames[ctx.locale]?.[site.genre] || site.genreLabel || categoryLabel(site.genre,ctx.locale))}</a>`).join('')}</nav></details>`;
}

function header(ctx) {
  const {copy,site,root} = ctx;
  return `<a class="skip-link" href="#main">${esc(copy.skip)}</a><header class="site-header"><div class="header-main wrap"><a class="brand" href="${root}" aria-label="${esc(site.brand)}"><span class="brand-mark" aria-hidden="true">${icon('sparkle')}</span><span class="brand-type">GuideHollow<span class="brand-genre">${esc(ctx.genre)}</span></span></a><form class="search-form" role="search" action="${root}#collection"><label class="sr-only" for="site-search">${esc(copy.searchLabel)}</label>${icon('search')}<input id="site-search" name="q" type="search" placeholder="${esc(copy.searchPlaceholder)}" autocomplete="off"><button class="icon-button clear-search" type="button" data-clear-search aria-label="${esc(copy.clearSearch)}" hidden>${icon('close')}</button></form><a class="favorites-link" href="${root}?view=favorites#collection" data-view-link="favorites">${icon('heart')}<span>${esc(copy.favorites)}</span><span class="favorite-count" data-favorite-count>0</span></a></div><div class="browse-navigation wrap">${genreMenu(ctx)}<nav class="header-nav" aria-label="${esc(copy.menu)}"><a href="${root}#collection" data-category-link="">${esc(copy.all)}</a>${(site.subcategories || []).slice(0,7).map(category => `<a href="${root}?category=${encodeURIComponent(category)}#collection" data-category-link="${esc(category)}">${esc(categoryLabel(category,ctx.locale))}</a>`).join('')}<a class="nav-recent" href="${root}?view=recent#collection" data-view-link="recent">${icon('clock')}${esc(copy.recent)}</a></nav></div></header>`;
}

function footer(ctx) {
  const siblings = ctx.sites.filter(site => site.locale === ctx.locale && site.genre !== ctx.site.genre);
  const languages = ctx.sites.filter(site => site.genre === ctx.site.genre && (ctx.page !== 'game' || site.gameIds?.includes(ctx.game?.id)));
  return `<footer class="site-footer"><div class="wrap footer-top${languages.length > 1 ? '' : ' no-languages'}"><div><a class="footer-brand" href="${ctx.root}">${esc(ctx.site.brand)}</a><p>${esc(ctx.copy.footerTag)}</p><p class="small">${esc(ctx.copy.localNote)}</p></div><div class="footer-pages"><a href="${ctx.root}about/">${esc(ctx.copy.about)}</a><a href="${ctx.root}privacy/">${esc(ctx.copy.privacy)}</a></div>${languages.length > 1 ? `<nav class="language-nav" aria-label="${esc(ctx.copy.languages)}">${icon('globe')}${languages.map(site => { const hasGame = ctx.page === 'game' && site.gameIds?.includes(ctx.game?.id); const path = ctx.page === 'game' ? hasGame ? pathFor('game',ctx.game) : '' : ctx.page === '404' ? '' : pathFor(ctx.page); return `<a href="${esc(absolute(site,path))}" lang="${esc(site.locale)}" hreflang="${esc(site.locale)}"${site.id === ctx.site.id ? ' aria-current="true"' : ''}>${esc(getCopy(site.locale).language)}</a>`; }).join('')}</nav>` : ''}</div><div class="wrap footer-bottom">${siblings.length ? `<nav aria-label="${esc(ctx.copy.otherCollections)}">${siblings.map(site => `<a href="${esc(site.baseUrl)}">${esc(site.brand)}</a>`).join('')}</nav>` : ''}<p>${esc(ctx.copy.footerRights)}</p></div></footer>`;
}

function homeContent(ctx) {
  const [featured,...rest] = ctx.games;
  const {copy,site} = ctx;
  return `<main id="main"><section class="hero wrap"><div class="hero-heading"><p class="eyebrow"><span class="tiny-square"></span> ${esc(site.brand)}</p><h1>${esc(site.tagline || site.title)}</h1><div class="hero-intro"><p>${esc(site.description)}</p><a class="text-link" href="#collection">${esc(copy.browse)} ${icon('arrow')}</a></div></div>${featured ? `<div class="hero-gallery${rest.length ? '' : ' solo'}"><article class="feature-card"><a href="${gamePath(ctx,featured)}">${imageMarkup(featured,ctx,{eager:true,large:true})}<div class="feature-overlay"><span class="feature-label">${icon('sparkle')} ${esc(copy.featured)}</span><div class="feature-title"><div><span class="eyebrow">${esc(categoryLabel(featured.categories?.find(c=>c!==site.genre)||site.genre,ctx.locale))}</span><h2>${esc(featured.title)}</h2></div><span class="round-play">${icon('arrow')}</span></div></div></a>${favorite(featured,ctx)}</article><div class="secondary-features${rest.length === 1 ? ' single' : ''}">${rest.slice(0,2).map((game,i) => `<article class="secondary-feature"><a href="${gamePath(ctx,game)}">${imageMarkup(game,ctx)}<div class="secondary-copy"><span class="eyebrow">${esc(categoryLabel(game.categories?.find(c=>c!==site.genre)||site.genre,ctx.locale))}</span><h2>${esc(game.title)}</h2><span class="text-link">${esc(copy.view)} ${icon('arrow')}</span></div></a>${favorite(game,ctx)}</article>`).join('')}</div></div>` : ''}</section><section id="collection" class="collection wrap" aria-labelledby="collection-title"><div class="section-heading"><div><p class="eyebrow">${esc(ctx.genre)}</p><h2 id="collection-title">${esc(copy.catalog)}</h2></div><p class="collection-count" data-result-count aria-live="polite">${esc(interpolate(copy.results,{count:ctx.games.length}))}</p></div><div class="collection-toolbar"><div class="view-switch" role="group" aria-label="${esc(copy.filter)}"><button type="button" data-view="all" aria-pressed="true">${esc(copy.all)}</button><button type="button" data-view="favorites" aria-pressed="false">${icon('heart')}${esc(copy.favorites)}</button><button type="button" data-view="recent" aria-pressed="false">${icon('clock')}${esc(copy.recent)}</button></div><label class="sort-control"><span class="sr-only">${esc(copy.sort)}</span><select data-sort><option value="curated">${esc(copy.curated)}</option><option value="az">${esc(copy.az)}</option></select></label></div><div class="category-filters" role="group" aria-label="${esc(copy.category)}"><button type="button" data-category="" aria-pressed="true">${esc(copy.all)}</button>${(site.subcategories || []).map(category => `<button type="button" data-category="${esc(category)}" aria-pressed="false">${esc(categoryLabel(category,ctx.locale))}</button>`).join('')}</div><div class="game-grid" data-game-grid>${ctx.games.map((game,i) => card(game,ctx,i)).join('')}</div><div class="empty-state" data-empty hidden>${icon('search')}<h3 data-empty-title>${esc(copy.noResults)}</h3><p data-empty-text>${esc(copy.noResultsText)}</p><button class="button secondary" type="button" data-reset>${esc(copy.reset)}</button></div><noscript><p class="notice">${esc(copy.noJs)}</p></noscript></section><section class="collection-story wrap"><div><p class="eyebrow">${esc(site.brand)}</p><h2>${esc(interpolate(copy.browseGenre,{genre:ctx.genre}))}</h2></div><p>${esc(site.intro || site.description)}</p></section><section class="faq wrap" aria-labelledby="faq-title"><h2 id="faq-title">${esc(copy.faq)}</h2><div class="faq-grid">${copy.faqItems.map(([q,a]) => `<details><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join('')}</div></section></main>`;
}

function gameContent(ctx) {
  const {copy,game,site} = ctx;
  if (!game) throw new Error('Game page needs a game object');
  const languages = (game.languages || []).map(language => languageLabel(language,ctx.locale));
  const platforms = (game.platforms || []).map(platform => ({desktop:copy.desktop, mobile:copy.mobile, tablet:copy.tablet}[String(platform).toLowerCase()] || platform));
  const categoryTags = (game.categories || []).map(category => `<a href="${ctx.root}?category=${encodeURIComponent(category)}#collection">${esc(categoryLabel(category,ctx.locale))}</a>`).join('');
  return `<main id="main" class="game-page wrap"><nav class="breadcrumbs" aria-label="${esc(copy.home)}"><a href="${ctx.root}">${esc(site.brand)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(game.title)}</span></nav><div class="game-heading"><div><p class="eyebrow">${esc(ctx.genre)}</p><h1>${esc(game.title)}</h1></div><div class="detail-actions">${favorite(game,ctx,'labeled-favorite')}<button class="button secondary compact" type="button" data-share>${icon('share')}<span>${esc(copy.share)}</span></button></div></div><section class="player-section" aria-label="${esc(game.title)}"><div class="player" data-player><div class="player-preview" data-preview>${imageMarkup(game,ctx,{eager:true,large:true})}<div class="preview-shade"></div><div class="play-callout"><span class="player-category">${esc(ctx.genre)}</span><h2>${esc(game.title)}</h2><button class="button play-button" type="button" data-play>${icon('play')}${esc(copy.play)}</button><p>${esc(copy.launchHelp)}</p></div></div><div class="frame-stage" data-frame-stage hidden></div><div class="player-toolbar" data-player-toolbar hidden><p data-player-status role="status">${esc(copy.loading)}</p><div><button class="icon-button" type="button" data-fullscreen aria-label="${esc(copy.fullscreen)}" title="${esc(copy.fullscreen)}">${icon('full')}</button><button class="icon-button" type="button" data-close-game aria-label="${esc(copy.close)}" title="${esc(copy.close)}">${icon('close')}</button></div></div></div><div class="launch-notes"><p>${esc(copy.launchNote)}</p><a href="${esc(game.affiliateUrl)}" target="_blank" rel="noopener sponsored">${esc(copy.external)} ${icon('external')}</a></div><p class="launch-languages"><strong>${esc(copy.gameLanguage)}:</strong> ${esc(languages.join(' · ') || copy.notSpecified)}</p><p class="fullscreen-help" data-fullscreen-help hidden>${esc(copy.fullscreenHint)}</p></section><div class="game-information"><article class="editorial"><section><p class="eyebrow">${esc(copy.aboutGame)}</p><h2>${esc(game.title)}</h2>${game.textFallback ? `<p class="notice">${esc(copy.originalText)}</p>` : ''}${paragraphs(game.description || copy.unavailableDescription)}</section><section class="instructions"><h2>${esc(copy.how)}</h2>${paragraphs(game.instructions || copy.unavailableInstructions)}</section></article><aside class="game-facts"><h2>${esc(copy.launchDetails)}</h2><dl><div><dt>${esc(copy.category)}</dt><dd class="fact-tags">${categoryTags}</dd></div><div><dt>${esc(copy.platforms)}</dt><dd>${esc(platforms.join(' · ') || copy.notSpecified)}</dd></div><div><dt>${esc(copy.orientation)}</dt><dd>${esc(({portrait:copy.portrait,landscape:copy.landscape}[game.orientation] || copy.anyOrientation))}</dd></div><div><dt>${esc(copy.gameLanguage)}</dt><dd>${esc(languages.join(' · ') || copy.notSpecified)}</dd></div></dl><p class="small">${esc(copy.languageNote)}</p></aside></div><section class="related"><div class="section-heading"><h2>${esc(copy.more)}</h2><a class="text-link" href="${ctx.root}#collection">${esc(copy.all)} ${icon('arrow')}</a></div><div class="game-grid related-grid">${ctx.games.filter(candidate => candidate.id !== game.id).slice(0,4).map((candidate,i)=>card(candidate,ctx,i)).join('')}</div></section></main>`;
}

function articleContent(ctx) {
  const privacy = ctx.page === 'privacy';
  const {copy} = ctx;
  const sections = privacy ? copy.privacySections : copy.aboutSections;
  return `<main id="main" class="article-page wrap"><nav class="breadcrumbs" aria-label="${esc(copy.home)}"><a href="${ctx.root}">${esc(ctx.site.brand)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(privacy ? copy.privacy : copy.about)}</span></nav><div class="article-heading"><p class="eyebrow">${esc(ctx.site.brand)}</p><h1>${esc(privacy ? copy.privacyTitle : copy.aboutTitle)}</h1><p class="article-lead">${esc(privacy ? copy.privacyLead : copy.aboutLead)}</p></div><div class="article-body">${sections.map(([title,text]) => `<section><h2>${esc(title)}</h2>${paragraphs(interpolate(text,{genre:ctx.genre}))}</section>`).join('')}${privacy ? `<div class="policy-links"><a href="https://playgama.com/confidential" rel="noopener" target="_blank">${esc(copy.playgamaPolicy)} ${icon('external')}</a><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener" target="_blank">${esc(copy.githubPolicy)} ${icon('external')}</a></div><section class="storage-panel"><h2>${esc(copy.clearStorage)}</h2><p>${esc(copy.clearStorageHint)}</p><button class="button secondary" type="button" data-clear-storage>${esc(copy.clearStorage)}</button></section>` : `<a class="button" href="${ctx.root}#collection">${esc(copy.browse)} ${icon('arrow')}</a>`}</div></main>`;
}

function pageMetadata(ctx) {
  const {site,copy,game,page} = ctx;
  const title = page === 'home' ? site.title || site.brand : page === 'game' ? `${game.title} — ${copy.how} & ${copy.play} | ${site.brand}` : `${page === 'privacy' ? copy.privacy : page === 'about' ? copy.about : copy.noPageTitle} | ${site.brand}`;
  const description = excerpt(page === 'game' ? game.description : page === 'privacy' ? copy.privacyLead : page === 'about' ? copy.aboutLead : site.description);
  const canonical = absolute(site,pathFor(page,game));
  const thumbnail = page === 'game' ? game.thumbnail : ctx.games[0]?.thumbnail;
  const alternatives = page === '404' ? [] : ctx.sites.filter(candidate => candidate.genre === site.genre && (page !== 'game' || candidate.gameIds?.includes(game.id)));
  const schema = page === 'game' ? [{ '@context':'https://schema.org','@type':'VideoGame', name:game.title, description:asText(game.description), url:canonical, image:game.thumbnail, genre:(game.categories||[]).map(category=>categoryLabel(category,ctx.locale)), inLanguage:game.languages||[], gamePlatform:game.platforms||[], applicationCategory:'Game' }, {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:site.brand,item:site.baseUrl},{'@type':'ListItem',position:2,name:game.title,item:canonical}]}] : page === 'home' ? [{'@context':'https://schema.org','@type':'CollectionPage',name:site.title || site.brand,description:site.description,url:canonical,inLanguage:ctx.locale,hasPart:ctx.games.map(game=>({'@type':'VideoGame',name:game.title,url:absolute(site,pathFor('game',game))}))}] : [];
  return {title,description,canonical,thumbnail,alternatives,schema};
}

export function renderPage(options) {
  const ctx = context(options);
  const meta = pageMetadata(ctx);
  const {site,copy,page} = ctx;
  const verification = site.naverVerification || ctx.verification?.naver;
  const config = {siteId:site.id,locale:ctx.locale,page,root:ctx.root,canonical:meta.canonical,copy,games:ctx.games.map(game=>({id:game.id,title:game.title,originalTitle:options.games?.find?.(candidate=>candidate.id===game.id)?.title || game.title,categories:game.categories||[],categoryLabels:(game.categories||[]).map(category=>categoryLabel(category,ctx.locale))})),game:ctx.game ? {id:ctx.game.id,title:ctx.game.title,embedUrl:ctx.game.embedUrl,affiliateUrl:ctx.game.affiliateUrl,orientation:ctx.game.orientation} : null};
  const content = page === 'home' ? homeContent(ctx) : page === 'game' ? gameContent(ctx) : page === '404' ? `<main id="main" class="not-found wrap"><p class="eyebrow">404</p><h1>${esc(copy.noPageTitle)}</h1><p>${esc(copy.noPageText)}</p><a class="button" href="${ctx.root}">${esc(copy.backHome)} ${icon('arrow')}</a></main>` : articleContent(ctx);
  return `<!doctype html><html lang="${esc(ctx.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.title)}</title><meta name="description" content="${esc(meta.description)}"><link rel="canonical" href="${esc(meta.canonical)}">${page==='404'||ctx.preview?'<meta name="robots" content="noindex,follow">':''}${verification ? `<meta name="naver-site-verification" content="${esc(verification)}">` : ''}<meta name="theme-color" content="${esc(site.accent || '#246b4b')}"><meta property="og:type" content="${page==='game'?'website':'website'}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:url" content="${esc(meta.canonical)}"><meta property="og:site_name" content="${esc(site.brand)}"><meta property="og:locale" content="${{en:'en_US',ko:'ko_KR',ja:'ja_JP'}[ctx.locale] || ctx.locale}">${meta.thumbnail?`<meta property="og:image" content="${esc(meta.thumbnail)}"><meta property="og:image:alt" content="${esc(ctx.game?.title || ctx.games[0]?.title)}"><meta name="twitter:card" content="summary_large_image">`:''}${meta.alternatives.map(candidate => `<link rel="alternate" hreflang="${esc(candidate.locale)}" href="${esc(absolute(candidate,pathFor(page,ctx.game)))}">`).join('')}<link rel="icon" href="${ctx.root}favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${ctx.root}assets/site.css">${meta.schema.map(value=>`<script type="application/ld+json">${json(value)}</script>`).join('')}<script id="site-config" type="application/json">${json(config)}</script><script src="${ctx.root}assets/site.js" defer></script></head><body data-theme="${esc(site.theme || site.genre)}" data-page="${page}">${header(ctx)}${content}${footer(ctx)}<div class="toast" role="status" aria-live="polite" data-toast hidden></div></body></html>`;
}

export const renderHome = options => renderPage({...options,page:'home'});
export const renderGame = options => renderPage({...options,page:'game'});
export const renderAbout = options => renderPage({...options,page:'about'});
export const renderPrivacy = options => renderPage({...options,page:'privacy'});
export const render404 = options => renderPage({...options,page:'404'});

export function renderFavicon(site) {
  const colors = {puzzle:['#246b4b','#f6f4ea'],racing:['#f47936','#171918'],sports:['#2560c8','#f3f6fa'],arcade:['#f2dc69','#252142'],horror:['#ed777a','#161316'],shooting:['#62d4ed','#142126'],simulation:['#16766b','#f6f2e9'],idle:['#bded65','#172330']};
  const [accent,bg] = colors[site.theme || site.genre] || colors.puzzle;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/><path d="m32 10 6 16 16 6-16 6-6 16-6-16-16-6 16-6Z" fill="${accent}"/></svg>`;
}
