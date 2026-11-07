# Catalog provenance

Catalog checked on 2026-11-07 using the public Playgama partner catalog. Public application code identifies the export request below; no account cookies, private credentials or API secrets were used for the catalog download.

```
POST https://widgets.playgama.com/api/v1/partner/export/catalogue/games
Content-Type: application/json

{"pagination":{"limit":100,"offset":0},"filters":{"interests":["puzzle"]},"sort":{"type":"ranking_default"}}
```

The same request was made for racing, sports and arcade. Forty games were curated for the initial four English sites. Provider titles, game links, preview images, device lists, screen orientation and supported languages are retained. Editorial introductions and instructions were rewritten from the provider's descriptions and control instructions; they do not claim firsthand gameplay, ratings, verified performance or independent reviews.

The public application references these endpoints and metadata sources:

- https://widgets.playgama.com/static/assets/index-BMvEMxuF.js
- https://widgets.playgama.com/static/assets/types-B2ZHmZ7x.js
- https://widgets.playgama.com/api/v1/partner/export/catalogue/filters
- https://widgets.playgama.com/api/v1/partner/export/catalogue/sort

The account-specific publisher CLID was copied from the signed-in catalog's visible embed link and attached to the unmodified provider export and affiliate URLs. Images remain served by the provider; game software is not copied into this repository.
