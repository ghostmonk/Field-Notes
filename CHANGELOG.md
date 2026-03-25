# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **csp:** Move PDF generation server-side to eliminate `unsafe-eval` from Content Security Policy ([#169](https://github.com/ghostmonk/Field-Notes/pull/169))
- **csp:** Sanitize `Content-Disposition` filename to prevent header injection ([#169](https://github.com/ghostmonk/Field-Notes/pull/169))

## [0.5.0] - 2026-03-22

### Added

- **ui:** Component library with Button, Dialog, Tabs, FormField, Grid, Textarea primitives and full codebase migration ([#168](https://github.com/ghostmonk/Field-Notes/pull/168))
- **auth:** Mock SSO for local development — role-picker buttons replace Google Sign-In when `NODE_ENV=development` ([#167](https://github.com/ghostmonk/Field-Notes/pull/167))
- **resume:** Job applications tracker with tabbed admin UI for managing applications ([#162](https://github.com/ghostmonk/Field-Notes/pull/162))
- **resume:** Voice management tab with reclassify and delete for tailored resume voices ([#163](https://github.com/ghostmonk/Field-Notes/pull/163))
- **resume:** Voice feedback loop — iterative refinement of tailored resume output ([#161](https://github.com/ghostmonk/Field-Notes/pull/161))
- **resume:** AI resume tailoring LLM pipeline — job analysis, generation, evaluation via Claude ([#159](https://github.com/ghostmonk/Field-Notes/pull/159))
- **resume:** Vector pipeline for resume tailoring — chunking, Voyage AI embeddings, Qdrant storage ([#156](https://github.com/ghostmonk/Field-Notes/pull/156))
- **editor:** TipTap editor overhaul with improved toolbar and editing experience ([#157](https://github.com/ghostmonk/Field-Notes/pull/157))
- **branding:** Ghostmonk SVG logo and social links in footer ([#158](https://github.com/ghostmonk/Field-Notes/pull/158))

### Fixed

- **auth:** Fix OAuth token rotation and session expiry — global signOut, auth cleanup ([#165](https://github.com/ghostmonk/Field-Notes/pull/165))
