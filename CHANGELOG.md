# Changelog

All notable changes to Fusion Smart Search will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Entry-file header converted to the standard module docstring plus the seven
  metadata dunders.
- `ADDIN_VERSION` now derives from `__version__` instead of carrying a stale
  literal `'2.0.0'` that contradicted the shipped v1.0.0 release.
- Assigned a unique manifest GUID. The add-in had been sharing
  `edae7804-…` with Fusion Notion Notes, which it was cloned from.

### Removed

- `.claude/settings.local.json`, a local Claude Code session file that had been
  committed to the repository.

## [1.0.0] - 2026-01-27

### Added

- Quick Access Toolbar buttons for YouTube, Autodesk Forums, Google, Reddit and
  Facebook searches.
- AI assistant searches: ChatGPT, Claude, Gemini and Perplexity.
- HTML settings palette for toggling individual services on and off.
- Configuration persisted to `config.json` beside the add-in.
