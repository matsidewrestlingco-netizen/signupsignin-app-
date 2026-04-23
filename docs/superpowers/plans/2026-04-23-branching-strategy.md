# Branching Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the feature-branch workflow and v1.0.0 baseline tags across both repos so all future roadmap work follows a consistent branching and versioning convention.

**Architecture:** Tag both repos at v1.0.0 to mark the App Store / production launch baseline. Add a CLAUDE.md to each repo documenting the workflow so it is always visible in context. Clean up the stale local feature branch on the mobile repo.

**Tech Stack:** Git, GitHub

---

### Task 1: Tag the web app at v1.0.0

**Files:**
- No file changes — git tag only

- [ ] **Step 1: Confirm you are on `main` and up to date**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
git checkout main
git status
```

Expected: `On branch main, nothing to commit, working tree clean`

- [ ] **Step 2: Create and push the v1.0.0 tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

Expected: `* [new tag]  v1.0.0 -> v1.0.0`

- [ ] **Step 3: Verify the tag exists**

```bash
git tag
```

Expected output includes: `v1.0.0`

---

### Task 2: Tag the mobile app at v1.0.0

**Files:**
- No file changes — git tag only

- [ ] **Step 1: Confirm you are on `main` and up to date**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
git checkout main
git status
```

Expected: `On branch main, nothing to commit, working tree clean`

- [ ] **Step 2: Create and push the v1.0.0 tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

Expected: `* [new tag]  v1.0.0 -> v1.0.0`

- [ ] **Step 3: Verify the tag exists**

```bash
git tag
```

Expected output includes: `v1.0.0`

---

### Task 3: Clean up stale branch on mobile

**Files:**
- No file changes — branch cleanup only

- [ ] **Step 1: Delete the local stale feature branch**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
git branch -d feature/app-store-submission
```

Expected: `Deleted branch feature/app-store-submission`

If it says "not fully merged", inspect with `git log feature/app-store-submission` before force-deleting. If the work is already in `main`, force delete with `git branch -D feature/app-store-submission`.

- [ ] **Step 2: Verify branch is gone**

```bash
git branch
```

Expected: only `* main` listed

---

### Task 4: Add CLAUDE.md to the web app

**Files:**
- Create: `signupsignin-app/CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md**

Create `/Users/danielemmons/Desktop/Matside Software/signupsignin-app/CLAUDE.md` with this content:

```markdown
# SignupSignin Web App

React + TypeScript + Vite + Firebase web app for the SignupSignin volunteer management platform.

## Branching Strategy

- `main` — always production-ready; never commit directly
- `feature/<kebab-case-name>` — one branch per roadmap item, cut from `main`, deleted after merge

### Workflow for every feature

1. `git checkout main && git pull`
2. `git checkout -b feature/<name>`
3. Build and test the feature
4. `git checkout main && git merge feature/<name>`
5. `git branch -d feature/<name>`
6. `git tag vX.Y.Z && git push origin main --tags`
7. `firebase deploy`

### Versioning

Semantic versioning (`MAJOR.MINOR.PATCH`):
- PATCH — bug fix or small tweak (e.g. `v1.0.1`)
- MINOR — new roadmap feature (e.g. `v1.1.0`)
- MAJOR — breaking change (e.g. `v2.0.0`)

Web and iOS version numbers are independent.

## Deploy

```bash
firebase deploy
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Firebase (Firestore, Auth, Hosting, Functions)
- Tailwind CSS
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with branching strategy and project overview"
```

Expected: 1 file changed, N insertions

---

### Task 5: Add CLAUDE.md to the mobile app

**Files:**
- Create: `signupsignin-mobile/CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md**

Create `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/CLAUDE.md` with this content:

```markdown
# SignupSignin iOS App

React Native + Expo + TypeScript iOS app for the SignupSignin volunteer management platform.

## Branching Strategy

- `main` — always production-ready; never commit directly
- `feature/<kebab-case-name>` — one branch per roadmap item, cut from `main`, deleted after merge

### Workflow for every feature

1. `git checkout main && git pull`
2. `git checkout -b feature/<name>`
3. Build and test the feature
4. `git checkout main && git merge feature/<name>`
5. `git branch -d feature/<name>`
6. `git tag vX.Y.Z && git push origin main --tags`
7. EAS build + App Store submission (batch multiple features before submitting)

### Versioning

Semantic versioning (`MAJOR.MINOR.PATCH`):
- PATCH — bug fix or small tweak (e.g. `v1.0.1`)
- MINOR — new roadmap feature or batch (e.g. `v1.1.0`)
- MAJOR — breaking change (e.g. `v2.0.0`)

Web and iOS version numbers are independent.

### iOS Batching

Apple review adds 1–3 days per submission. Accumulate several feature merges on `main` before running EAS submit to minimize review cycles.

## Deploy

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## Tech Stack

- React Native + Expo (SDK 52)
- TypeScript
- Firebase (Firestore, Auth)
- Expo Router
- EAS Build + Submit
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with branching strategy and project overview"
```

Expected: 1 file changed, N insertions

---

### Task 6: Push both repos

- [ ] **Step 1: Push web app**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
git push origin main
```

- [ ] **Step 2: Push mobile app**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
git push origin main
```

- [ ] **Step 3: Verify on GitHub**

Check that both repos on GitHub show:
- The `v1.0.0` tag under Releases/Tags
- The new `CLAUDE.md` file at the repo root
- Only `main` as the active branch
