# App Store Submission Design
**Date:** 2026-04-10
**App:** SignupSignin (Matside Wrestling)
**Bundle ID:** `com.matsidewrestling.signupsignin`
**Version:** 1.0.0
**Platform:** iOS only (this submission)
**Build strategy:** EAS Build + EAS Submit (Option A)

---

## Overview

First-time submission of SignupSignin to the Apple App Store. The app is a wrestling event volunteer signup/signin tool used by Matside Wrestling. EAS is already configured with a production build profile. This plan covers all steps from `app.json` finalization through App Store review submission.

---

## Section 1: app.json Finalization

Small additions required before triggering a production build:

- **`ios.buildNumber`**: Set initial value to `"1"`. EAS `autoIncrement: true` will manage subsequent increments automatically.
- **`ios.infoPlist.CFBundleDisplayName`**: Set to `"SignupSignin"` to control the home screen display name explicitly.
- **`ios.infoPlist.NSCameraUsageDescription`**: Explicitly declare camera usage description for App Review. The Expo camera plugin sets one, but an explicit `infoPlist` entry ensures consistency.
- **`ios.privacyManifests`**: Add Apple-required privacy manifest declaring which required reason APIs the app uses. Expo SDK uses system APIs (e.g., `NSUserDefaults`, file timestamps) that require explicit declaration in `PrivacyInfo.xcprivacy` format via EAS config.

---

## Section 2: App Store Connect Record

Manual setup at appstoreconnect.apple.com before submitting a build:

- **New app**: iOS platform, bundle ID `com.matsidewrestling.signupsignin`, primary language English (US)
- **App name**: SignupSignin
- **Subtitle**: Optional — e.g., "Wrestling Event Volunteer Tool"
- **Description**: Explain the app's purpose — volunteer signup/signin for wrestling events, QR code check-in, admin event management
- **Keywords**: wrestling, volunteer, signup, signin, event, check-in, sports
- **Support URL**: `https://www.signupsignin.com/support`
- **Privacy Policy URL**: `https://www.signupsignin.com/privacy`
- **Age rating**: 4+
- **Pricing**: Free

---

## Section 3: Screenshot Generation

Apple requires at least one screenshot set for a **6.5" iPhone display** (iPhone 15 Pro Max simulator). No iPad screenshots needed since `supportsTablet: false`.

Screenshots to capture (minimum 1, up to 10):
1. Sign-in screen
2. Volunteer dashboard / event list
3. QR code scanner
4. Admin dashboard / event management

**Process:**
- Run `expo start --ios` targeting the iPhone 15 Pro Max simulator
- Use the simulator's built-in screenshot tool (Cmd+S) or Xcode's screenshot feature
- Export at full resolution (no text overlays or device frames required by Apple, though optional)

---

## Section 4: EAS Build + Submit

### 4a. Credentials Setup
Run `eas credentials` and select iOS. Let EAS generate and manage:
- iOS Distribution Certificate
- App Store provisioning profile

No manual certificate management needed.

### 4b. Production Build
```bash
eas build --platform ios --profile production
```
- Triggers a cloud build on EAS servers
- `autoIncrement: true` automatically bumps the build number in App Store Connect
- Build artifact is a signed `.ipa` stored on EAS

### 4c. Finalize App Store Connect Listing
Before submitting, complete in App Store Connect:
- Upload screenshots from Section 3
- Confirm all metadata from Section 2 is filled in
- Confirm age rating questionnaire is complete
- Add the build once it appears in App Store Connect (takes ~15–30 min after EAS build completes)

### 4d. Submit for Review
```bash
eas submit --platform ios
```
- Selects the latest production build
- Pushes it to App Store Connect
- From there, click "Submit for Review" in App Store Connect

Apple's review typically takes 1–3 business days for a first submission.

---

## Key Constraints

- **Privacy manifest required**: Expo SDK 50+ apps must include `PrivacyInfo.xcprivacy` or Apple will reject the build.
- **All metadata must be complete** before App Review will accept the submission.
- **Google Sign-In**: The app uses `expo-auth-session/providers/google`. The app `scheme` (`signupsignin`) is already set in `app.json` and the iOS client ID is already in EAS env vars — no additional URL scheme configuration needed.

---

## Out of Scope

- Google Play Store submission (deferred)
- TestFlight external beta testing (optional, can be done after build uploads)
- Push notification certificate setup beyond what EAS manages
