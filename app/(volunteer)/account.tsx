import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';

export default function VolunteerAccount() {
  const { userProfile, logOut, deleteAccount } = useAuth();
  const { currentOrg } = useOrg();
  const [deleting, setDeleting] = useState(false);

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logOut().catch(() => {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            });
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be reversed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Delete My Account', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      const msg = e instanceof Error ? e.message : '';
      if (code === 'auth/requires-recent-login' || msg.includes('requires-recent-login')) {
        Alert.alert(
          'Sign In Required',
          'For security, please sign in again and then delete your account from the Account page.'
        );
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{userProfile?.name ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{userProfile?.email ?? '—'}</Text>
          </View>
        </View>

        {/* Organization card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Organization</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{currentOrg?.name ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Type</Text>
            <Text style={styles.rowValue}>{currentOrg?.type ?? '—'}</Text>
          </View>
        </View>

        {/* Account actions card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  signOutBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  signOutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
