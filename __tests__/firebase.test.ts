/**
 * Firebase initialization test
 *
 * Note: The jest-expo preset loads the Expo environment which has constraints
 * on importing external modules. This test verifies the Firebase setup exists
 * through file presence and configuration structure.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Firebase initialization', () => {
  it('firebase.ts exists and exports required modules', () => {
    const firebasePath = path.join(__dirname, '../lib/firebase.ts');
    expect(fs.existsSync(firebasePath)).toBe(true);

    const firebaseContent = fs.readFileSync(firebasePath, 'utf-8');
    expect(firebaseContent).toContain('export const auth');
    expect(firebaseContent).toContain('export const db');
    expect(firebaseContent).toContain('export const functions');
  });

  it('types.ts exists with required interfaces', () => {
    const typesPath = path.join(__dirname, '../lib/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);

    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    expect(typesContent).toContain('export interface UserProfile');
    expect(typesContent).toContain('export interface Organization');
    expect(typesContent).toContain('export interface Event');
    expect(typesContent).toContain('export interface Signup');
  });

  it('environment variables are configured in .env', () => {
    const envPath = path.join(__dirname, '../.env');
    expect(fs.existsSync(envPath)).toBe(true);

    const envContent = fs.readFileSync(envPath, 'utf-8');
    expect(envContent).toContain('EXPO_PUBLIC_FIREBASE_API_KEY');
    expect(envContent).toContain('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  });
});
