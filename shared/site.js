(() => {
  'use strict';
  const configElement = document.getElementById('site-config');
  if (!configElement) return;
  let config;
  try { config = JSON.parse(configElement.textContent); } catch { return; }
  const { copy, siteId, games = [] } = config;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const genreMenu = $('[data-genre-menu]');
  document.addEventListener('pointerdown', event => {
    if (genreMenu?.open && !genreMenu.contains(event.target)) genreMenu.open = false;
  });
  const format = (value, fields = {}) => String(value).replace(/\{(\w+)\}/g, (_, name) => fields[name] ?? `{${name}}`);
  const ids = new Set(games.map(game => game.id));
  const key = type => `guidehollow:${siteId}:${type}`;
  const normalize = text => String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(config.locale);
  let toastTimer;
  let storageWarningShown = false;
  function toast(message) {
    const element = $('[data-toast]');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4200);
  }
  function read(type) {
    try { const value = JSON.parse(localStorage.getItem(key(type)) || '[]'); return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && ids.has(id)))] : []; } catch { return []; }
  }
  function write(type, value) {
    try { localStorage.setItem(key(type), JSON.stringify(value)); } catch {
      if (!storageWarningShown) { toast(copy.storageError); storageWarningShown = true; }
    }
  }
  let favorites = new Set(read('favorites'));
  let recent = read('recent').slice(0,24);
  function updateFavorites() {
    $$('[data-favorite]').forEach(button => {
      const active = favorites.has(button.dataset.favorite);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', format(active ? copy.removeTitle : copy.saveTitle, { title: button.dataset.title }));
      const label = $('.favorite-text', button);
      if (label) label.textContent = active ? copy.saved : copy.save;
    });
    $$('[data-favorite-count]').forEach(element => { element.textContent = String(favorites.size); });
  }
  $$('[data-game-image]').forEach(image => {
    const unavailable = () => { const art = image.closest('.game-art'); art?.classList.add('is-unavailable'); image.setAttribute('aria-hidden','true'); art?.querySelector('.image-fallback')?.setAttribute('aria-hidden','false'); };
    image.addEventListener('error', unavailable);
    if (image.complete && image.naturalWidth === 0) unavailable();
  });
  const params = new URLSearchParams(location.search);
  const state = {
    query: params.get('q') || '',
    category: params.get('category') || '',
    view: ['favorites','recent'].includes(params.get('view')) ? params.get('view') : 'all',
    sort: params.get('sort') === 'az' ? 'az' : 'curated'
  };
  const search = $('#site-search');
  const clearSearch = $('[data-clear-search]');
  const grid = $('[data-game-grid]');
  const cards = grid ? new Map($$('[data-card]', grid).map(card => [card.dataset.card,card])) : new Map();
  const searchTerms = new Map(games.map(game => [game.id, normalize([game.title,game.originalTitle,...(game.categories || []),...(game.categoryLabels || [])].join(' '))]));
  function updateUrl() {
    const url = new URL(location.href);
    for (const field of ['q','category','view','sort']) url.searchParams.delete(field);
    if (state.query.trim()) url.searchParams.set('q', state.query.trim());
    if (state.category) url.searchParams.set('category', state.category);
    if (state.view !== 'all') url.searchParams.set('view', state.view);
    if (state.sort !== 'curated') url.searchParams.set('sort', state.sort);
    try { history.replaceState(null, '', url); } catch {}
  }
  function syncControls() {
    if (search && search.value !== state.query) search.value = state.query;
    if (clearSearch) clearSearch.hidden = !state.query;
    $$('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    $$('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
    $$('[data-category-link]').forEach(link => { if (link.dataset.categoryLink === state.category && state.view === 'all') link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current'); });
    const sort = $('[data-sort]');
    if (sort) sort.value = state.sort;
  }
  function filterGames({ saveUrl = true } = {}) {
    if (!grid) return;
    const query = normalize(state.query.trim());
    let visible = games.filter(game => (!query || searchTerms.get(game.id).includes(query)) && (!state.category || game.categories.includes(state.category)) && (state.view !== 'favorites' || favorites.has(game.id)) && (state.view !== 'recent' || recent.includes(game.id)));
    if (state.sort === 'az') visible.sort((a,b) => a.title.localeCompare(b.title,config.locale,{numeric:true}));
    else if (state.view === 'recent') visible.sort((a,b) => recent.indexOf(a.id) - recent.indexOf(b.id));
    cards.forEach(card => { card.hidden = true; });
    visible.forEach(game => { const card = cards.get(game.id); if (card) { card.hidden = false; grid.append(card); } });
    const count = $('[data-result-count]');
    if (count) count.textContent = visible.length === 1 ? copy.oneResult : format(copy.results,{count:visible.length});
    const empty = $('[data-empty]');
    if (empty) {
      empty.hidden = visible.length > 0;
      const untouchedFavorites = state.view === 'favorites' && favorites.size === 0;
      const untouchedRecent = state.view === 'recent' && recent.length === 0;
      $('[data-empty-title]',empty).textContent = untouchedFavorites ? copy.noFavorites : untouchedRecent ? copy.noRecent : copy.noResults;
      $('[data-empty-text]',empty).textContent = untouchedFavorites ? copy.noFavoritesText : untouchedRecent ? copy.recentHint : copy.noResultsText;
    }
    syncControls();
    if (saveUrl) updateUrl();
  }
  function scrollCollection() { $('#collection')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'}); }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-favorite]');
    if (!button) return;
    const id = button.dataset.favorite;
    if (!ids.has(id)) return;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    write('favorites', [...favorites]);
    updateFavorites();
    if (grid) filterGames({saveUrl:false});
  });
  if (grid) {
    search?.addEventListener('input', () => { state.query = search.value; filterGames(); });
    search?.closest('form')?.addEventListener('submit', event => { event.preventDefault(); state.query = search.value; filterGames(); scrollCollection(); });
    $$('[data-view]').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; filterGames(); }));
    $$('[data-category]').forEach(button => button.addEventListener('click', () => { state.category = button.dataset.category; filterGames(); }));
    $$('[data-category-link]').forEach(link => link.addEventListener('click', event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); state.category = link.dataset.categoryLink; state.view = 'all'; filterGames(); scrollCollection(); }));
    $$('[data-view-link]').forEach(link => link.addEventListener('click', event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); state.view = link.dataset.viewLink; filterGames(); scrollCollection(); }));
    $('[data-sort]')?.addEventListener('change', event => { state.sort = event.target.value; filterGames(); });
    $('[data-reset]')?.addEventListener('click', () => { Object.assign(state,{query:'',category:'',view:'all',sort:'curated'}); filterGames(); search?.focus(); });
    filterGames({saveUrl:false});
  }
  clearSearch?.addEventListener('click', () => { if (search) search.value = ''; state.query = ''; if (grid) filterGames(); else clearSearch.hidden = true; search?.focus(); });
  if (!grid) search?.addEventListener('input', () => { if (clearSearch) clearSearch.hidden = !search.value; });
  $('[data-clear-storage]')?.addEventListener('click', () => {
    favorites.clear(); recent = [];
    try { localStorage.removeItem(key('favorites')); localStorage.removeItem(key('recent')); } catch {}
    updateFavorites();
    if (grid) filterGames({saveUrl:false});
    toast(copy.clearedStorage);
  });
  addEventListener('storage', event => {
    if (event.key && ![key('favorites'),key('recent')].includes(event.key)) return;
    favorites = new Set(read('favorites')); recent = read('recent').slice(0,24); updateFavorites();
    if (grid) filterGames({saveUrl:false});
  });
  $('[data-share]')?.addEventListener('click', async () => {
    const share = {title:config.game?.title || document.title,url:config.canonical};
    try {
      if (navigator.share) { await navigator.share(share); return; }
      if (!navigator.clipboard?.writeText) { toast(copy.copyFailed); return; }
      await navigator.clipboard.writeText(share.url); toast(copy.copied);
    } catch (error) { if (error.name !== 'AbortError') toast(copy.copyFailed); }
  });
  const player = $('[data-player]');
  const preview = $('[data-preview]');
  const stage = $('[data-frame-stage]');
  const toolbar = $('[data-player-toolbar]');
  const status = $('[data-player-status]');
  const playButton = $('[data-play]');
  const fullscreenButton = $('[data-fullscreen]');
  let frame = null;
  let loadingTimer;
  function closeGame({focus=true} = {}) {
    clearTimeout(loadingTimer);
    if (document.fullscreenElement === player) document.exitFullscreen?.().catch(() => {});
    if (frame) { frame.remove(); frame = null; }
    if (preview) preview.hidden = false;
    if (stage) { stage.hidden = true; stage.replaceChildren(); }
    if (toolbar) toolbar.hidden = true;
    const hint = $('[data-fullscreen-help]');
    if (hint) hint.hidden = true;
    if (focus) { playButton?.focus(); toast(copy.closeNotice); }
  }
  playButton?.addEventListener('click', () => {
    if (frame || !config.game?.embedUrl || !stage) return;
    const iframe = document.createElement('iframe');
    iframe.title = config.game.title;
    iframe.allow = 'autoplay; fullscreen; gamepad';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.addEventListener('load', () => { if (frame === iframe && status) status.textContent = copy.frameOpened; });
    iframe.addEventListener('error', () => { if (status) status.textContent = copy.externalHelp; });
    iframe.src = config.game.embedUrl;
    frame = iframe;
    stage.replaceChildren(iframe);
    stage.hidden = false;
    preview.hidden = true;
    toolbar.hidden = false;
    status.textContent = copy.loading;
    const hint = $('[data-fullscreen-help]');
    if (hint) hint.hidden = false;
    recent = [config.game.id,...recent.filter(id => id !== config.game.id)].slice(0,24);
    write('recent',recent);
    loadingTimer = setTimeout(() => { if (frame && status) status.textContent = copy.stillLoading; },20000);
    iframe.focus();
  });
  $('[data-close-game]')?.addEventListener('click', () => closeGame());
  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (player?.requestFullscreen) await player.requestFullscreen();
      else toast(copy.fullscreenUnavailable);
    } catch { toast(copy.fullscreenUnavailable); }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!fullscreenButton) return;
    const label = document.fullscreenElement === player ? copy.exitFullscreen : copy.fullscreen;
    fullscreenButton.setAttribute('aria-label',label); fullscreenButton.title = label;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && genreMenu?.open) {
      genreMenu.open = false;
      $('summary', genreMenu)?.focus();
      return;
    }
    if (event.key === 'Escape' && frame && !document.fullscreenElement) closeGame();
  });
  addEventListener('pagehide', () => closeGame({focus:false}));
  updateFavorites();
})();
