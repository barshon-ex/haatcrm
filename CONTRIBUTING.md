# Contributing to HaatCRM / অবদান রাখুন

ধন্যবাদ! যেকোনো ভাষায় (বাংলা বা ইংরেজি) Issue বা PR খুলতে পারেন।

## Getting started

```bash
npm install
npm run seed
npm run dev
```

Before opening a PR:

```bash
npm test
npm run typecheck
npm run build
```

## Good first contributions

- **Real-world messages the parser gets wrong** — add them as test cases in `tests/parser.test.ts` (remove real names/numbers first!), then improve `src/lib/parser.ts`.
- **Courier integrations** — Steadfast, Pathao and RedX have merchant APIs. Add a module under `src/lib/couriers/`.
- **Translations** — all UI text lives in `src/lib/i18n.ts`. Add a key to both `bn` and `en`.
- **District / area data** — `src/lib/bd.ts` (`DISTRICTS`, `DHAKA_AREAS`).

## Guidelines

- Keep it simple to self-host: no external services required to run.
- Every UI string goes through `i18n.ts`.
- Database changes go in `src/lib/schema.sql` and must be backwards compatible (`CREATE ... IF NOT EXISTS`, additive `ALTER TABLE`).
- Never commit real customer data.
