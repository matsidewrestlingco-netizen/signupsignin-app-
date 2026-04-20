# iOS Privacy Policy & Support Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Legal card to the volunteer Account tab that lets users open the Privacy Policy and Support pages in Safari via `Linking.openURL()`.
**Architecture:** A single new card section (`Legal`) is appended below the existing `Actions` card in `app/(volunteer)/account.tsx`; no new files, no new context, no routing — just two tappable rows using React Native's built-in `Linking` API. The test for the Account screen already lives at `__tests__/screens/VolunteerAccount.test.tsx` and will be extended with three new assertions.
**Tech Stack:** React Native, Expo, TypeScript, Linking (react-native)

---

## Files to modify

| File | Change |
|---|---|
| `app/(volunteer)/account.tsx` | Add `Linking` import; add `LEGAL_URLS` constants; add Legal card JSX; add `legalRow` and `legalChevron` styles |
| `__tests__/screens/VolunteerAccount.test.tsx` | Add `Linking` mock; add three new test cases for the Legal card |

No new files are created.

---

## Tasks

### Task 1 — Write the failing tests

- [ ] Open `__tests__/screens/VolunteerAccount.test.tsx`.

- [ ] Add a `Linking` mock immediately after the existing `jest.mock` calls (before the `import VolunteerAccount` line):

```typescript
const mockOpenURL = jest.fn().mockResolvedValue(undefined);
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: mockOpenURL,
}));
```

- [ ] Add `mockOpenURL` to the `beforeEach` clear block:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentOrg = { id: 'org1', name: 'Test Wrestling Club', type: 'Wrestling' };
  // mockOpenURL is cleared by jest.clearAllMocks()
});
```

- [ ] Append three new test cases inside the existing `describe('VolunteerAccount', ...)` block, after the last existing test:

```typescript
it('renders the Legal card heading', () => {
  const { getByText } = render(<VolunteerAccount />);
  expect(getByText('Legal')).toBeTruthy();
});

it('renders Privacy Policy and Support rows', () => {
  const { getByText } = render(<VolunteerAccount />);
  expect(getByText('Privacy Policy')).toBeTruthy();
  expect(getByText('Support')).toBeTruthy();
});

it('opens the correct URL when Privacy Policy is pressed', () => {
  const { getByText } = render(<VolunteerAccount />);
  fireEvent.press(getByText('Privacy Policy'));
  expect(mockOpenURL).toHaveBeenCalledWith('https://signupsignin.com/privacy');
});

it('opens the correct URL when Support is pressed', () => {
  const { getByText } = render(<VolunteerAccount />);
  fireEvent.press(getByText('Support'));
  expect(mockOpenURL).toHaveBeenCalledWith('https://signupsignin.com/support');
});
```

- [ ] Run the tests and confirm they fail with "Unable to find an element with text: 'Legal'":

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile" && npx jest __tests__/screens/VolunteerAccount.test.tsx --no-coverage
```

Expected output (4 failing, rest passing):
```
  ● VolunteerAccount › renders the Legal card heading
  ● VolunteerAccount › renders Privacy Policy and Support rows
  ● VolunteerAccount › opens the correct URL when Privacy Policy is pressed
  ● VolunteerAccount › opens the correct URL when Support is pressed
```

---

### Task 2 — Add `Linking` import and URL constants to account.tsx

- [ ] Open `app/(volunteer)/account.tsx`.

- [ ] Change the existing React Native import line from:

```typescript
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
```

to:

```typescript
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
```

- [ ] Add the two URL constants directly after the import block, before the `export default function VolunteerAccount()` line:

```typescript
const PRIVACY_URL = 'https://signupsignin.com/privacy';
const SUPPORT_URL = 'https://signupsignin.com/support';
```

---

### Task 3 — Add the Legal card JSX

- [ ] In `app/(volunteer)/account.tsx`, locate the closing `</View>` of the `Actions` card (the block ending with the Delete Account `TouchableOpacity`). It currently reads:

```tsx
        </View>
      </ScrollView>
```

- [ ] Replace that closing sequence with:

```tsx
        </View>

        {/* Legal card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => Linking.openURL(PRIVACY_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.legalChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.legalRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL(SUPPORT_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Support</Text>
            <Text style={styles.legalChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
```

---

### Task 4 — Add styles for the Legal card rows

- [ ] In `app/(volunteer)/account.tsx`, locate the `StyleSheet.create({...})` block. Append the two new style entries before the closing `});`:

```typescript
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  legalChevron: {
    fontSize: 20,
    color: '#9ca3af',
    lineHeight: 22,
  },
```

---

### Task 5 — Run the tests and confirm they all pass

- [ ] Run the full Account test suite:

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile" && npx jest __tests__/screens/VolunteerAccount.test.tsx --no-coverage
```

Expected output:
```
 PASS  __tests__/screens/VolunteerAccount.test.tsx
  VolunteerAccount
    ✓ renders Account header
    ✓ renders user name
    ✓ renders user email
    ✓ renders org name
    ✓ renders org type
    ✓ renders Sign Out button
    ✓ shows confirmation alert when Sign Out is pressed
    ✓ calls logOut when alert is confirmed
    ✓ shows dashes when no org is linked
    ✓ renders a Delete Account button
    ✓ shows the first confirmation alert when Delete Account is pressed
    ✓ shows the second confirmation alert when first Delete is confirmed
    ✓ renders the Legal card heading
    ✓ renders Privacy Policy and Support rows
    ✓ opens the correct URL when Privacy Policy is pressed
    ✓ opens the correct URL when Support is pressed

Test Suites: 1 passed, 1 total
```

---

### Task 6 — Run the full test suite to check for regressions

- [ ] Run all tests (excluding firebase.test.ts per jest config):

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile" && npx jest --no-coverage
```

Expected output:
```
Test Suites: X passed, X total
Tests:       X passed, X total
```

All suites pass with zero failures.

---

### Task 7 — Commit

- [ ] Stage both changed files:

```bash
git -C "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile" add app/\(volunteer\)/account.tsx __tests__/screens/VolunteerAccount.test.tsx
```

- [ ] Commit:

```bash
git -C "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile" commit -m "$(cat <<'EOF'
feat: add Legal card with Privacy Policy and Support links to Account tab

Satisfies Apple App Store requirement for an accessible privacy policy
link; both rows open signupsignin.com URLs in Safari via Linking.openURL.
EOF
)"
```

Expected output:
```
[main XXXXXXX] feat: add Legal card with Privacy Policy and Support links to Account tab
 2 files changed, ...
```

---

## Success criteria cross-check

| Spec requirement | Covered by |
|---|---|
| "Privacy Policy" row visible in Legal card | Task 3 JSX + Task 1 test "renders Privacy Policy and Support rows" |
| "Support" row visible in Legal card | Task 3 JSX + Task 1 test "renders Privacy Policy and Support rows" |
| Legal card is below Actions card | Task 3 JSX order (appended after Actions `</View>`) |
| Right chevron `›` on each row | Task 3 JSX `legalChevron` + Task 4 style |
| Tapping Privacy Policy opens `https://signupsignin.com/privacy` | Task 1 test + Task 2 `PRIVACY_URL` constant + Task 3 `onPress` |
| Tapping Support opens `https://signupsignin.com/support` | Task 1 test + Task 2 `SUPPORT_URL` constant + Task 3 `onPress` |
| Opens in device browser (Safari), not in-app webview | `Linking.openURL()` is used (not expo-web-browser) |
| Style consistent with existing cards | Uses `styles.card`, `styles.cardTitle`, `styles.rowLabel` + new `legalRow`/`legalChevron` styles |
| No Firestore reads, no auth required | URLs are static constants; no hooks called |
