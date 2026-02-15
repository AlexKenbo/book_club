# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Offline-first PWA for a distributed home library ("Книжный клуб ЦХМ"). Users digitize books, share them within a community, and manage lending requests. Built with React + TypeScript + Vite, using RxDB (IndexedDB) for local storage and Supabase for cloud sync. All UI text is in Russian.

## Commands

- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build
- `npm run preview` — preview production build
- `npx supabase start` — start local Supabase (Docker required)
- `npx supabase db reset` — apply all migrations locally

No automated tests or linting tools are configured.

## Architecture

### Data Flow

All writes go to RxDB first (optimistic UI updates), then sync to Supabase via `replicateSupabase`. The app remains fully functional offline. In demo mode, sync is disabled.

Three replicated collections: `books`, `requests`, `profiles`.

### Field Mapping

Supabase uses `snake_case`, the app uses `camelCase`. Mappers `toRx()` and `toSupabase()` in `db.ts` handle conversion. When adding new fields, both mappers must be updated.

### Authentication

Custom OTP flow (not Supabase Auth): Edge Functions `request-otp` and `verify-otp` send SMS via SMSC and issue JWT. Token stored in `localStorage` and injected into Supabase client headers.

### Routing

Custom router implementation in `components/Layout.tsx` — no React Router. Navigation uses a custom `RouterContext`.

### Key Files

- `App.tsx` — routing, session init, demo mode orchestration
- `db.ts` — RxDB schema definitions, Supabase replication setup, field mappers
- `types.ts` — all TypeScript types/enums (BookStatus, RequestStatus, BookCategory)
- `lib/supabaseClient.ts` — Supabase client init, JWT management
- `lib/storage.ts` — image upload to Supabase Storage
- `services/mockData.ts` — demo mode seed data generator

### Adding New Fields

1. Update types in `types.ts`
2. Update RxDB schema and `toRx`/`toSupabase` mappers in `db.ts`
3. Add a Supabase migration in `supabase/migrations/`

### Demo Mode

Toggled via `libshare_demo_mode` in localStorage. Uses three mock users (MOCK_USER_A/B/C) from `services/mockData.ts`. Replication is disabled in demo mode.

## Tech Stack

- React 19, TypeScript 5.8, Vite 6.2
- RxDB 16 (IndexedDB via Dexie) + RxJS 7
- Supabase (Postgres + Edge Functions in Deno)
- @heroicons/react for icons
- Path alias: `@/*` maps to project root

## Deployment

GitHub Actions deploys to Yandex Object Storage on push to `main`. Pipeline: Node 20 → npm install → build → upload dist/ to S3-compatible storage.
