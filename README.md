# GuideHollow game collections

An Astro static site for a language-and-genre-specific Playgama collection. The initial release uses the four existing English puzzle, racing, sports and arcade repositories. The source also supports Korean and Japanese configurations for later activation. Each repository deploys one combination to its own subdomain through GitHub Actions and GitHub Pages.

## Build and preview

Use Node.js 24. The package declares a minimum of Node.js 22.23.4, and Astro is pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run build
npm run preview
```

`npm run build` prepares the static assets, runs **`astro build`**, then verifies the generated pages. Pages are rendered to HTML during the build; the catalog, game descriptions and instructions do not depend on browser JavaScript to appear.

For development:

```sh
npm run dev
```

## Select the repository's site

Set `deployment.json` at the root of each repository:

```json
{
  "genre": "puzzle",
  "locale": "en"
}
```

The supported genres are `puzzle`, `racing`, `sports`, and `arcade`. The supported locales are `en`, `ko`, and `ja`. The local default, when no deployment file exists, is English puzzle.

Environment variables can override that selection for a local build:

```sh
SITE_GENRE=racing SITE_LOCALE=ko OUTPUT_DIR=dist-ko-racing npm run build
```

Run different site builds sequentially in one checkout because their generated public assets use the same temporary directory. The deployed output contains only the selected site's pages. Sites marked `active: false` are excluded from build selection, navigation and `hreflang` links. Activate a future configuration only when its public site is ready. A game's language counterpart is linked only when that site actually includes the game.

| Language | Puzzle | Racing | Sports | Arcade |
|---|---|---|---|---|
| English | `en-puzzle.guidehollow.com` | `en-racing.guidehollow.com` | `en-sports.guidehollow.com` | `en-arcade.guidehollow.com` |
| Korean | `ko-puzzle.guidehollow.com` | `ko-racing.guidehollow.com` | `ko-sports.guidehollow.com` | `ko-arcade.guidehollow.com` |
| Japanese | `ja-puzzle.guidehollow.com` | `ja-racing.guidehollow.com` | `ja-sports.guidehollow.com` | `ja-arcade.guidehollow.com` |

The English row contains the initial release targets; the Korean and Japanese rows are inactive future configurations. DNS, HTTPS availability and search-engine submission status are separate from a successful local build.

## Content and page generation

- `data/sites.json` defines the sites, activation flags, canonical addresses, selected game IDs, introductory text and public IndexNow keys.
- `data/catalog.json` contains game metadata and the English, Korean and Japanese editorial descriptions and instructions.
- `shared/` contains the localized interface, HTML renderer, browser behavior and genre styling.
- `src/pages/` provides Astro's static routes and the custom error page.
- `scripts/` selects the deployment, prepares assets and sitemaps, and validates the output.

The game catalog is curated. To add a game, use its actual Playgama catalog metadata, add useful instructions and translated editorial text, then include its ID in the intended site selections. Do not invent game features, ratings, review counts, supported languages or device compatibility. A selected game must list native support for that site's language; the build rejects mismatches. Translated editorial text alone does not qualify a game for a different language's collection.

Preserve each provider's exact `gameURL`. Some games use provider-specific export domains. Both the embed URL and the fallback Playgama URL must retain the publisher's public `clid` query parameter. Do not replace a provider URL with a guessed path derived from its slug.

## Search-engine implementation

Game pages include a distinct title, description, visible instructions, canonical URL and structured game/breadcrumb data. Language counterparts use `hreflang` links. A single `sitemap.xml` lists the selected site's public pages and their available language counterparts. `robots.txt` allows crawling and advertises the sitemap.

The build verification checks that generated pages exist, use the correct language and canonical domain, contain metadata, preserve publisher attribution, and do not contain an already-loaded game iframe. It also checks sitemap coverage and the required deployment assets.

Google Search Console uses the site's public sitemap. Naver notification uses IndexNow after publishing, rather than adding a site through the Naver dashboard. A notification does not guarantee indexing or rankings.

### Naver IndexNow

Each site has its own public `indexNowKey`. The build writes a UTF-8 `<key>.txt` file at the site's root, containing that exact key. After a successful Pages deployment, the workflow checks the live HTTPS key file and sends one JSON request containing the selected host, key, key location and actual public page URLs to `https://searchadvisor.naver.com/indexnow`.

The notifier uses Node's standard library, so its deployment-job step does not need `npm ci`. Key checks are bounded to three attempts, with five-second gaps and a total notification time budget of 55 seconds. Every request retains normal TLS verification. If the key cannot yet be verified because DNS, HTTPS or deployment propagation is pending, the script reports `pending` and sends no POST. An HTTP 429 stops the run without an immediate retry.

- `submitted` / HTTP 200 means Naver received the URLs.
- `pending` / HTTP 202 means Naver received the URLs but key validation remains pending.
- Other unconfirmed or unsuccessful responses are reported explicitly; they are not treated as proof of indexing.

The IndexNow workflow step uses `continue-on-error: true`, writes a separate result to the GitHub Actions summary and emits a warning when pending or unsuccessful. This preserves the distinction between successful website deployment and search-engine notification. Pending notification returns exit code 2, while failure returns exit code 1.

To check the local configuration without network requests:

```sh
npm run indexnow -- --dry-run
```

After the HTTPS site is live, a manual notification can be sent with:

```sh
npm run indexnow
```

Both commands use the same repository deployment selection as the build. The normal publish workflow automatically runs the live command after deployment.

## Deployment

The workflow in `.github/workflows/deploy.yml` runs on pushes to `main` and can also be started manually. It installs locked dependencies with `npm ci`, builds the selected Astro site, uploads `dist` and deploys the artifact to GitHub Pages. A new push cancels an older unfinished deployment of the same repository.

In the repository's Pages settings, select **GitHub Actions** as the publishing source and configure that repository's exact custom domain. At the DNS provider, add the specific subdomain's CNAME pointing to `emfls.github.io`. Existing unrelated DNS records should remain intact. HTTPS availability is verified after GitHub finishes certificate provisioning.

The build emits a `CNAME` file for clarity, but GitHub Actions deployments require the custom domain to be configured in repository Pages settings; that artifact alone does not register the domain.

## Runtime behavior and privacy

The site does not create a GuideHollow account. Favorites and recent launches use local browser storage. Search and filtering run in the browser. Game thumbnails load from catalog-provided image hosts. A game iframe is created only after the visitor chooses Play, at which point Playgama and the game provider may process requests, show advertising or offer optional purchases under their policies.

There is no custom ad network, analytics tracker or server-side user database in this source. Game artwork, titles and embedded games remain the property of their respective owners. Partner attribution is configured in the links; earnings and payout eligibility must be confirmed in the publisher account.
