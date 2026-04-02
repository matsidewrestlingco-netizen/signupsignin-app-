import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useSignups } from '../../hooks/useSignups';
import type { Signup } from '../../lib/types';

// ─── Scanner Sub-component ────────────────────────────────────────────────────

interface ScannerViewProps {
  signups: Signup[];
  checkIn: (id: string) => Promise<void>;
}

function ScannerView({ signups, checkIn }: ScannerViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'already' | 'not-found';
    userName?: string;
  } | null>(null);

  function handleBarcodeScanned({ data }: { data: string }) {
    setScanned(true);
    const userSignups = signups.filter(s => s.userId === data);
    if (userSignups.length === 0) {
      setScanResult({ status: 'not-found' });
      return;
    }
    const notCheckedIn = userSignups.filter(s => !s.checkedIn);
    if (notCheckedIn.length === 0) {
      setScanResult({ status: 'already', userName: userSignups[0].userName });
      return;
    }
    Promise.all(notCheckedIn.map(s => checkIn(s.id)))
      .then(() => setScanResult({ status: 'success', userName: notCheckedIn[0].userName }))
      .catch(() => setScanResult({ status: 'not-found' }));
  }

  if (permission === null) {
    return null;
  }

  if (!permission?.granted) {
    return (
      <View style={sc.permContainer}>
        <Text style={sc.permText}>Camera access needed to scan QR codes</Text>
        <TouchableOpacity style={sc.permBtn} onPress={requestPermission}>
          <Text style={sc.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={sc.container}>
      <View style={sc.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        {/* Overlay frame */}
        <View style={sc.overlay}>
          <View style={sc.viewfinder} />
        </View>
        <Text style={sc.hint}>Point camera at volunteer's QR code</Text>

        {/* Result overlay */}
        {scanned && scanResult && (
          <View
            style={[
              sc.resultOverlay,
              scanResult.status === 'success' && sc.resultSuccess,
              scanResult.status === 'already' && sc.resultAlready,
              scanResult.status === 'not-found' && sc.resultNotFound,
            ]}
          >
            <Text style={sc.resultIcon}>
              {scanResult.status === 'success' ? '✓' : scanResult.status === 'already' ? '⚠' : '✗'}
            </Text>
            {scanResult.userName ? (
              <Text style={sc.resultName}>{scanResult.userName}</Text>
            ) : null}
            <Text style={sc.resultMsg}>
              {scanResult.status === 'success'
                ? 'Checked In!'
                : scanResult.status === 'already'
                ? 'Already checked in'
                : 'Volunteer not found for this event'}
            </Text>
            <TouchableOpacity
              style={sc.scanAnotherBtn}
              onPress={() => {
                setScanned(false);
                setScanResult(null);
              }}
            >
              <Text style={sc.scanAnotherText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Manual List Sub-component ────────────────────────────────────────────────

interface ManualListViewProps {
  signups: Signup[];
  loading: boolean;
  checkIn: (id: string) => Promise<void>;
  undoCheckIn: (id: string) => Promise<void>;
}

function ManualListView({ signups, loading, checkIn, undoCheckIn }: ManualListViewProps) {
  if (loading) {
    return (
      <View style={ml.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  function formatTime(date: Date): string {
    const h = date.getHours();
    const m = date.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  return (
    <View style={ml.container}>
      <Text style={ml.countText}>Showing {signups.length} signups</Text>
      {signups.length === 0 ? (
        <View style={ml.center}>
          <Text style={ml.emptyText}>No signups yet for this event.</Text>
        </View>
      ) : (
        <FlatList
          data={signups}
          keyExtractor={item => item.id}
          contentContainerStyle={ml.listContent}
          renderItem={({ item }) => (
            <View style={ml.card}>
              <View style={ml.cardLeft}>
                <Text style={ml.name}>{item.userName}</Text>
                <Text style={ml.email}>{item.userEmail}</Text>
                {item.note ? <Text style={ml.note}>{item.note}</Text> : null}
                {item.checkedIn && item.checkedInAt ? (
                  <Text style={ml.checkInTime}>{formatTime(item.checkedInAt)}</Text>
                ) : null}
              </View>
              <View style={ml.cardRight}>
                {!item.checkedIn ? (
                  <TouchableOpacity
                    style={ml.checkInBtn}
                    onPress={() => checkIn(item.id)}
                  >
                    <Text style={ml.checkInBtnText}>Check In</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={ml.checkedGroup}>
                    <Text style={ml.checkedText}>✓ In</Text>
                    <TouchableOpacity
                      style={ml.undoBtn}
                      onPress={() => undoCheckIn(item.id)}
                    >
                      <Text style={ml.undoBtnText}>Undo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminCheckIn() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mode, setMode] = useState<'scanner' | 'manual'>('scanner');

  const { currentOrg } = useOrg();
  const { events, loading: eventsLoading } = useEvents(currentOrg?.id);
  const { signups, loading: signupsLoading, checkIn, undoCheckIn } = useSignups(
    currentOrg?.id,
    selectedEventId ?? undefined
  );

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;
  const checkedInCount = signups.filter(s => s.checkedIn).length;

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  return (
    <SafeAreaView edges={['top']}>
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Check-In</Text>
          <Text style={s.headerStat}>{checkedInCount} checked in</Text>
        </View>

        {/* Event selector */}
        <View style={s.eventSelector}>
          <Text style={s.eventLabel}>Event:</Text>
          {eventsLoading ? (
            <ActivityIndicator size="small" color="#1a56db" style={s.eventLoader} />
          ) : events.length === 0 ? (
            <Text style={s.noEventsText}>No events</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.pillScroll}
              contentContainerStyle={s.pillContent}
            >
              {events.map(event => {
                const active = event.id === selectedEventId;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[s.pill, active ? s.pillActive : s.pillInactive]}
                    onPress={() => setSelectedEventId(event.id)}
                  >
                    <Text style={[s.pillText, active ? s.pillTextActive : s.pillTextInactive]}>
                      {event.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Mode toggle */}
        <View style={s.modeToggle}>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'scanner' && s.modeBtnActive]}
            onPress={() => setMode('scanner')}
          >
            <Text style={[s.modeBtnText, mode === 'scanner' && s.modeBtnTextActive]}>
              QR Scanner
            </Text>
          </TouchableOpacity>
          <View style={s.modeDivider} />
          <TouchableOpacity
            style={[s.modeBtn, mode === 'manual' && s.modeBtnActive]}
            onPress={() => setMode('manual')}
          >
            <Text style={[s.modeBtnText, mode === 'manual' && s.modeBtnTextActive]}>
              Manual List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={s.content}>
          {!selectedEvent ? (
            <View style={s.noEventContainer}>
              <Text style={s.noEventText}>Select an event above</Text>
            </View>
          ) : mode === 'scanner' ? (
            <ScannerView signups={signups} checkIn={checkIn} />
          ) : (
            <ManualListView
              signups={signups}
              loading={signupsLoading}
              checkIn={checkIn}
              undoCheckIn={undoCheckIn}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1a56db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerStat: {
    fontSize: 14,
    color: '#ffffff',
  },
  eventSelector: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  eventLoader: {
    marginLeft: 8,
  },
  noEventsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  pillScroll: {
    flex: 1,
  },
  pillContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#ffffff',
    borderColor: '#1a56db',
  },
  pillInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#1a56db',
  },
  pillTextInactive: {
    color: '#6b7280',
  },
  modeToggle: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#1a56db',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  modeDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#d1d5db',
  },
  content: {
    flex: 1,
  },
  noEventContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEventText: {
    fontSize: 15,
    color: '#6b7280',
  },
});

// Scanner styles
const sc = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 14,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultSuccess: { backgroundColor: '#059669' },
  resultAlready: { backgroundColor: '#d97706' },
  resultNotFound: { backgroundColor: '#dc2626' },
  resultIcon: {
    fontSize: 64,
    color: '#ffffff',
    marginBottom: 12,
  },
  resultName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  resultMsg: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  scanAnotherBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanAnotherText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  permBtn: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});

// Manual list styles
const ml = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
    fontStyle: 'italic',
  },
  checkInTime: {
    fontSize: 11,
    color: '#059669',
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  checkInBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkInBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  checkedGroup: {
    alignItems: 'center',
    gap: 6,
  },
  checkedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  undoBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  undoBtnText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
