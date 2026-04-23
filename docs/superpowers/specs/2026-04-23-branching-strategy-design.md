# Branching Strategy Design

**Date:** 2026-04-23
**Applies to:** signupsignin-app (web), signupsignin-mobile (iOS)
**Scope:** Version control workflow for all future feature development

---

## Context

Both the web app and iOS app launched at v1.0.0. All development to date has been committed directly to `main`. Going forward, features will be developed from the Q2–Q4 2026 roadmap. This document defines the branching strategy and versioning convention to use across both repos.

---

## Branch Structure

- **`main`** — always production-ready. Deployed code lives here. Never work directly on `main`.
- **`feature/<kebab-case-name>`** — one short-lived branch per roadmap item, cut from `main` and deleted after merge.

Branch names should match roadmap item names, e.g.:
- `feature/past-events-view`
- `feature/volunteer-qr-code`
- `feature/volunteer-names-ios`
- `feature/admin-cancel-signups-ios`

---

## Workflow

For every roadmap item:

1. **Start** — cut a branch from `main`:
   ```
   git checkout main
   git pull
   git checkout -b feature/<name>
   ```
2. **Build** — develop and test the feature on the branch.
3. **Merge** — merge back to `main` when the feature is complete:
   ```
   git checkout main
   git merge feature/<name>
   git branch -d feature/<name>
   ```
4. **Tag** — tag `main` with the new version:
   ```
   git tag v1.1.0
   git push origin main --tags
   ```
5. **Deploy** — manually trigger deployment:
   - **Web:** `firebase deploy`
   - **iOS:** EAS build + App Store submission

### iOS Batching

Apple review adds 1–3 days per submission. To minimize review cycles, accumulate several feature merges and tags on `main` before running an EAS submit. Web deploys can happen after each merge independently.

---

## Versioning

Semantic versioning (`MAJOR.MINOR.PATCH`) applied independently per repo — web and iOS version numbers do not need to stay in sync.

| Change type | Version bump | Example |
|---|---|---|
| Bug fix or small tweak | PATCH | `v1.0.1` |
| New roadmap feature | MINOR | `v1.1.0` |
| Batch of features (iOS release) | MINOR | `v1.2.0` |
| Breaking change (e.g. RSVP overhaul) | MAJOR | `v2.0.0` |

Both repos start at `v1.0.0`.

---

## Summary

- One `feature/<name>` branch per roadmap item
- Merge to `main` → tag → deploy
- Web deploys after each feature; iOS deploys batched to reduce App Store review cycles
- Version numbers are independent between web and iOS
