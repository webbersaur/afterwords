# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AfterWords is a patient-facing web app for cancer patients (expanding to all serious diagnoses). Two core features:
1. **Visit Recap** — Record/upload doctor visits, AI transcribes and summarizes into structured sections (diagnosis, treatment plan, medications, action items, follow-up questions)
2. **Care Circle** — Private patient update page where caregivers can co-post and friends/family can follow along and send messages of support

Currently an **MVP prototype** — all interactions are client-side simulations with demo data. No backend integration yet.

## Commands

```bash
# Run local dev server (from project root)
python3 -m http.server 8090

# No build step, no dependencies, no package.json
```

## Architecture

Vanilla HTML/CSS/JS static site. No frameworks or build tools.

### Pages
- `index.html` — Marketing landing page (hero, features, how it works, founder story, waitlist CTA)
- `app/record.html` — Visit Recap flow: 3-step UI (Record/Upload → Processing animation → AI summary review) with share-to-Care-Circle modal
- `app/care-circle.html` — Patient update page: profile hero, status card with treatment progress bar, chronological update feed, support messages

### CSS Structure
- `css/style.css` — Global styles, design tokens, shared components (buttons, nav, footer, layout utilities)
- `css/record.css` — Record page: step indicator, recorder UI, waveform animation, recap cards grid, share modal
- `css/care-circle.css` — Care Circle page: patient profile, status card, update feed timeline, message form

Page-specific stylesheets import the global stylesheet first.

### JS Structure
- `js/main.js` — Landing page: mobile nav toggle, IntersectionObserver scroll reveals, waitlist form (localStorage)
- `js/record.js` — Record page: tab switching, recording simulation with timer/waveform, file upload with drag-drop, 7-second processing animation, transcript toggle, share modal (personal note, photo upload, section picker with live preview)
- `js/care-circle.js` — Care Circle page: emoji reaction toggle with count, message form submission with animated insert

Each JS file independently handles mobile nav toggle (no shared module system).

## Design System

All design tokens are CSS custom properties in `css/style.css :root`:
- **Primary**: `--color-primary` #2a7d6e (calm teal) / `--color-primary-light` / `--color-primary-dark`
- **Accent**: `--color-accent` #e8944a (warm amber) / `--color-accent-light`
- **Typography**: Merriweather (serif) for headings, Inter (sans-serif) for body — loaded via Google Fonts
- **Spacing scale**: xs (0.5rem), sm (1rem), md (1.5rem), lg (3rem), xl (5rem)
- **Responsive breakpoint**: 768px

## Planned Backend Integration

The plan calls for Firebase or Supabase for auth (magic link), database, and file storage. Transcription via Whisper API, summarization via Claude API. None of this is wired up yet — the record page simulates the processing flow with hardcoded demo data.

## Conventions

- Mobile-first responsive design
- IntersectionObserver for scroll-triggered `.reveal` animations
- Semantic HTML (`<article>`, `<section>`, `<blockquote>`)
- IDs use kebab-case (`#btn-record`, `#share-modal`)
- Button variants: `.btn-primary` (teal), `.btn-outline` (teal border), `.btn-accent` (amber)
- `escapeHtml()` utility is duplicated in record.js and care-circle.js (no shared module)
- Demo content uses realistic cancer treatment data for authentic presentation
