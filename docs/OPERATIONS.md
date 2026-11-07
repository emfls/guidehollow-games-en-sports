# GuideHollow game sites

## Published scope

The initial release uses the four existing English repositories. No additional repositories or language sites are required for this release.

| Genre | Repository | Production address |
| --- | --- | --- |
| Puzzle | emfls/guidehollow-games-en-puzzle | https://en-puzzle.guidehollow.com/ |
| Racing | emfls/guidehollow-games-en-racing | https://en-racing.guidehollow.com/ |
| Sports | emfls/guidehollow-games-en-sports | https://en-sports.guidehollow.com/ |
| Arcade | emfls/guidehollow-games-en-arcade | https://en-arcade.guidehollow.com/ |

Each repository contains the same reusable Astro source. Its `deployment.json` selects one genre and locale. `main` pushes trigger the GitHub Actions build, verification and Pages deployment. Update the common source in each published repository when making a shared change.

## Games and languages

`data/catalog.json` contains the curated game metadata and original editorial descriptions. `data/sites.json` selects games for each site. A game may appear only on a site whose language is explicitly present in the provider's `languages` list. The build checks this rule. Translated website text does not establish in-game language support.

Prepared Korean and Japanese site configurations are inactive. Their URLs are absent from published navigation, canonical alternatives and sitemaps. Activate a future language site only after its repository, native-language selection, custom domain and HTTPS are ready.

Preserve the exact provider `embedUrl`, including its host, path and all existing query parameters. The publisher CLID must remain on both the embed and external fallback URL. Some games use an export domain other than playgama.com. The build rejects missing or duplicated CLID values.

## Search and publication

Every game is a static Astro page with a unique title, description, canonical URL, game guide, controls, related links, provider language/device information, VideoGame data and breadcrumbs. Ratings, player counts and reviews are not fabricated. XML sitemaps contain only actual indexable pages. Favorites and search filters do not create duplicate indexable routes.

Google: submit each production `/sitemap.xml` in the existing verified `guidehollow.com` Domain property in Search Console. This covers its subdomains. Submission and discovery do not guarantee indexing or rank.

Naver: use the IndexNow notification script after successful deployment. Each host publishes its own key file. The script checks the live key before posting that host's URLs to Naver's official endpoint. HTTP 200 means submitted; HTTP 202 means received with key verification pending. Neither response guarantees indexing. A failed search notification does not undo a successful site deployment; inspect the Actions step and retry only after resolving the stated cause.

## DNS and HTTPS

Each production host has a CNAME pointing to `emfls.github.io.`. GitHub Pages custom-domain settings must name the matching host, and the publishing source is GitHub Actions. Do not add unused wildcard records or repoint existing unrelated records. Enable Enforce HTTPS when GitHub makes the certificate available.

## Revenue and hosting

The sites use the publisher's Playgama tracking ID. That establishes attribution on the supplied links; it does not establish a completed payout setup or guarantee revenue. Review earnings and payout eligibility in the Playgama partner dashboard. No bank account, tax information or payment agreement was changed by this project.

GitHub Pages has service and usage restrictions, including restrictions on using Pages as free hosting for an online business. Before treating these sites as a sustained advertising business, confirm the intended use with GitHub or move the same static Astro output to hosting appropriate for that use. See the official sources below. Embedded games are hosted by the provider, but that alone does not establish an exemption from Pages policy.

## Official references

- https://wiki.playgama.com/playgama/for-partners/import-the-game-catalog
- https://widgets.playgama.com/
- https://docs.astro.build/en/guides/deploy/github/
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://searchadvisor.naver.com/guide/indexnow-about
- https://searchadvisor.naver.com/guide/indexnow-api-key
- https://searchadvisor.naver.com/guide/indexnow-request
