# App Store Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Submit SignupSignin v1.0.0 to the Apple App Store for review.

**Architecture:** EAS-managed cloud build with EAS Submit for automated delivery to App Store Connect. All iOS certificates and provisioning profiles are handled by EAS credentials. The only code change is an `app.json` update to add required iOS metadata before triggering the build.

**Tech Stack:** Expo SDK, EAS Build, EAS Submit, App Store Connect

---

## File Map

| File | Change |
|------|--------|
| `app.json` | Add `ios.buildNumber`, `ios.infoPlist`, `ios.privacyManifests` |

All other tasks are CLI commands or manual steps in App Store Connect.

---

### Task 1: Add iOS build metadata to app.json

**Files:**
- Modify: `app.json` (`ios` section)

- [ ] **Step 1: Verify the fields are currently missing**

Run:
```bash
cat app.json | python3 -c "import sys,json; d=json.load(sys.stdin); ios=d['expo']['ios']; print('buildNumber:', ios.get('buildNumber', 'MISSING')); print('infoPlist:', ios.get('infoPlist', 'MISSING')); print('privacyManifests:', ios.get('privacyManifests', 'MISSING'))"
```

Expected:
```
buildNumber: MISSING
infoPlist: MISSING
privacyManifests: MISSING
```

- [ ] **Step 2: Update the `ios` section in app.json**

Replace the current `"ios"` block in `app.json` with the following (leave everything else in the file unchanged):

```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "com.matsidewrestling.signupsignin",
  "buildNumber": "1",
  "infoPlist": {
    "CFBundleDisplayName": "SignupSignin",
    "NSCameraUsageDescription": "Allow SignupSignin to access your camera to scan volunteer QR codes."
  },
  "privacyManifests": {
    "NSPrivacyAccessedAPITypes": [
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
        "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
        "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime",
        "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace",
        "NSPrivacyAccessedAPITypeReasons": ["E174.1"]
      }
    ]
  }
},
```

> **Why the privacy manifest?** Apple requires apps to declare any "required reason APIs" used by the app or its SDKs. Expo SDK uses `NSUserDefaults`, file timestamps, system boot time, and disk space APIs internally. Without these declarations Apple will reject the build.

- [ ] **Step 3: Verify the changes are correct**

Run:
```bash
cat app.json | python3 -c "import sys,json; d=json.load(sys.stdin); ios=d['expo']['ios']; print('buildNumber:', ios.get('buildNumber')); print('CFBundleDisplayName:', ios.get('infoPlist',{}).get('CFBundleDisplayName')); print('NSCameraUsageDescription:', ios.get('infoPlist',{}).get('NSCameraUsageDescription')); print('privacyManifests entries:', len(ios.get('privacyManifests',{}).get('NSPrivacyAccessedAPITypes',[])))"
```

Expected:
```
buildNumber: 1
CFBundleDisplayName: SignupSignin
NSCameraUsageDescription: Allow SignupSignin to access your camera to scan volunteer QR codes.
privacyManifests entries: 4
```

- [ ] **Step 4: Confirm the JSON file is valid**

Run:
```bash
python3 -c "import json; json.load(open('app.json')); print('JSON is valid')"
```

Expected: `JSON is valid`

- [ ] **Step 5: Commit**

```bash
git add app.json
git commit -m "chore: add iOS build metadata and privacy manifest for App Store submission"
```

---

### Task 2: Create App Store Connect App Record

**This task is performed manually in the browser. No files change.**

- [ ] **Step 1: Open App Store Connect and create a new app**

Go to [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com) and sign in with your Apple Developer account.

Click **My Apps** → **+** → **New App** and fill in:
- **Platforms**: iOS
- **Name**: `SignupSignin`
- **Primary Language**: English (U.S.)
- **Bundle ID**: `com.matsidewrestling.signupsignin` (should appear automatically — it was registered when your Apple Developer account was linked via EAS)
- **SKU**: `signupsignin-v1` (internal identifier only, never shown to users)
- **User Access**: Full Access

Click **Create**.

- [ ] **Step 2: Fill in App Information**

Navigate to **App Information**:
- **Subtitle**: `Wrestling Event Volunteer Tool`
- **Privacy Policy URL**: `https://www.signupsignin.com/privacy`
- **Category** → Primary: **Sports**

Click **Save**.

- [ ] **Step 3: Set pricing**

Navigate to **Pricing and Availability**:
- **Price**: Free (Tier 0)
- **Availability**: All territories

Click **Save**.

- [ ] **Step 4: Fill in the App Store listing**

Navigate to **1.0 Prepare for Submission** → **App Store** tab. Fill in:

**Description** (copy-paste this):
```
SignupSignin is a wrestling event management tool for Matside Wrestling.

Volunteers can browse upcoming events, sign up for available time slots, and check in on event day using a built-in QR code scanner. Administrators can create and manage events, view day-of rosters, and track volunteer attendance in real time.

Features:
• Browse and sign up for volunteer slots at upcoming wrestling events
• QR code check-in on event day
• View your upcoming and past signups
• Admin tools for event creation, roster management, and live check-in tracking
• Calendar integration to add events directly to your calendar
```

**Keywords** (100 character limit):
```
wrestling,volunteer,signup,signin,event,check-in,sports,roster,qr,matside
```

**Support URL**: `https://www.signupsignin.com/support`

**Marketing URL**: leave blank

Do **not** click Submit yet — screenshots and a build still need to be added first.

---

### Task 3: Generate App Store Screenshots

Apple requires at least one screenshot set at the **6.9" display** size (iPhone 16 Pro Max, 1320 × 2868 px). You'll need two test accounts ready: one volunteer user and one admin user.

- [ ] **Step 1: Boot the iPhone 16 Pro Max simulator**

Run:
```bash
npx expo start --ios
```

If the simulator opens on the wrong device, in the Simulator app go to **File → Open Simulator → iPhone 16 Pro Max** to switch. Wait for the app to fully load before capturing.

- [ ] **Step 2: Screenshot 1 — Sign-in screen**

The app should open to the login screen. Press **Cmd+S** in the Simulator window. The screenshot saves to your Desktop with a name like `Simulator Screen Shot - iPhone 16 Pro Max - 2026-04-10 at ....png`. Rename it to `01-sign-in.png`.

- [ ] **Step 3: Screenshot 2 — Volunteer event list**

Sign in with a volunteer test account. Navigate to the **Events** tab. Press **Cmd+S**. Rename to `02-volunteer-events.png`.

- [ ] **Step 4: Screenshot 3 — QR code scanner**

Navigate to the **Check-In** tab (the QR scanner screen). Press **Cmd+S**. Rename to `03-qr-scanner.png`.

- [ ] **Step 5: Screenshot 4 — Admin dashboard**

Sign out and sign in with an admin test account. Navigate to the **Dashboard** tab. Press **Cmd+S**. Rename to `04-admin-dashboard.png`.

- [ ] **Step 6: Verify screenshot dimensions**

Run:
```bash
sips -g pixelWidth -g pixelHeight ~/Desktop/01-sign-in.png ~/Desktop/02-volunteer-events.png ~/Desktop/03-qr-scanner.png ~/Desktop/04-admin-dashboard.png
```

Expected: All four files should show `pixelWidth: 1320` and `pixelHeight: 2868`. If they differ, the wrong simulator device was used — reboot with iPhone 16 Pro Max and recapture.

---

### Task 4: Set Up EAS Credentials

- [ ] **Step 1: Run EAS credentials setup**

```bash
eas credentials
```

At the prompts:
- Select **iOS**
- Select **production** profile
- For **Distribution Certificate**: choose **Generate new Apple Distribution Certificate** (EAS manages it)
- For **Provisioning Profile**: choose **Generate new Apple Provisioning Profile** (EAS manages it)

EAS will prompt for your Apple Developer account credentials to generate these. Sign in when asked.

- [ ] **Step 2: Verify credentials are valid**

```bash
eas credentials --platform ios
```

Expected output includes a Distribution Certificate and an App Store provisioning profile both listed with status `valid`. If either shows `expired` or `missing`, re-run `eas credentials` and regenerate.

---

### Task 5: Trigger Production Build

- [ ] **Step 1: Start the build**

```bash
eas build --platform ios --profile production
```

When prompted:
- Confirm you want to use the EAS-managed credentials from Task 4
- The build will queue and you'll get a URL like:
  ```
  Build details: https://expo.dev/accounts/danielmswc/projects/signupsignin-mobile/builds/<build-id>
  ```

- [ ] **Step 2: Monitor build status**

Open the build URL in your browser. The build takes approximately 10–20 minutes. Wait until status shows **Finished** with a green **Successful** badge.

Common failures and fixes:
- **"Invalid credentials"**: Re-run Task 4 and regenerate credentials
- **"Invalid app.json"**: Re-verify Task 1 steps — run the verification command in Step 3 of Task 1

- [ ] **Step 3: Note the build ID**

After the EAS build succeeds, note the build URL shown in the terminal output — it will look like:
```
https://expo.dev/accounts/danielmswc/projects/signupsignin-mobile/builds/<build-id>
```

The build is stored on EAS servers at this point. It does **not** appear in App Store Connect yet — that happens in Task 7 when you run `eas submit`. You can proceed to Tasks 6 and 7 while the build is fresh.

---

### Task 6: Upload Screenshots and Finalize App Store Listing

**This task is performed manually in the browser after Task 5 completes.**

- [ ] **Step 1: Upload screenshots**

In App Store Connect → **1.0 Prepare for Submission** → **App Store** tab → scroll to **iPhone Screenshots** → **6.9-inch Display**:

Click **+** and upload in this order:
1. `01-sign-in.png`
2. `02-volunteer-events.png`
3. `03-qr-scanner.png`
4. `04-admin-dashboard.png`

Drag to reorder so `01-sign-in.png` is first if needed.

- [ ] **Step 2: Complete the age rating questionnaire**

Navigate to **App Information** → **Age Rating** → click **Edit**:
- All content categories (cartoon violence, mature/suggestive themes, etc.): **None**
- Unrestricted web access: **No**
- Gambling: **No**

Submit. The rating should resolve to **4+**.

- [ ] **Step 3: Add the build to the submission**

The build is uploaded to App Store Connect in Task 7 (`eas submit`). Come back to this step after Task 7 Step 1 completes. In **1.0 Prepare for Submission** → scroll to the **Build** section → click **+** → select the build. Allow 15–30 minutes after `eas submit` for the build to finish processing and appear.

- [ ] **Step 4: Check for incomplete fields**

Scroll through the entire **App Store** tab. Apple shows a red dot next to any required field that's missing. Resolve all red dots before proceeding. Common ones to check:
- Description (must be filled)
- Screenshots (must have at least 1 for 6.9" display)
- Support URL
- Privacy Policy URL
- Build selected
- Age rating complete

---

### Task 7: Submit for App Store Review

> **Sequencing note:** Complete Task 6 Steps 1–2 (screenshots + age rating) first. Then run Step 1 below. Then return to Task 6 Step 3 to add the build and check for red dots. Then run Step 2 below to submit for review.

- [ ] **Step 1: Upload the build to App Store Connect via EAS**

```bash
eas submit --platform ios
```

At the prompt, select the latest production build. EAS Submit will link it to your App Store Connect listing.

- [ ] **Step 2: Initiate review in App Store Connect**

In App Store Connect → **1.0 Prepare for Submission** → click **Add for Review** (top-right corner). Review the submission summary page — confirm the build, screenshots, and metadata all look correct — then click **Submit to App Review**.

- [ ] **Step 3: Confirm submission was received**

Navigate to the **Activity** tab in App Store Connect. The build status should show **Waiting for Review**.

You will receive an email notification when the review is complete. Apple's review for a first-time submission typically takes **1–3 business days**. If Apple requests changes, they will specify exactly what needs to be fixed before resubmission.
