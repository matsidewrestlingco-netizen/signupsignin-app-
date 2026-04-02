import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useTemplates } from '../../hooks/useTemplates';
import { formatEventDate } from '../../lib/dateUtils';

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminReports() {
  const [section, setSection] = useState<'reports' | 'templates' | 'settings'>('reports');

  const { currentOrg, updateOrganization } = useOrg();
  const { events } = useEvents(currentOrg?.id);
  const { templates, loading: templatesLoading, createTemplate, deleteTemplate } = useTemplates(
    currentOrg?.id
  );

  // ── Reports state ────────────────────────────────────────────────────────────
  const [reportData, setReportData] = useState<{
    totalSignups: number;
    totalCheckedIn: number;
  } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg?.id) return;
    setReportLoading(true);
    getDocs(collection(db, 'organizations', currentOrg.id, 'signups'))
      .then((snap) => {
        const docs = snap.docs.map((d) => d.data());
        setReportData({
          totalSignups: docs.length,
          totalCheckedIn: docs.filter((d) => d.checkedIn).length,
        });
      })
      .catch(() => setReportData({ totalSignups: 0, totalCheckedIn: 0 }))
      .finally(() => setReportLoading(false));
  }, [currentOrg?.id]);

  // ── Templates state ──────────────────────────────────────────────────────────
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateEventTitle, setTemplateEventTitle] = useState('');
  const [templateEventLocation, setTemplateEventLocation] = useState('');
  const [templateDuration, setTemplateDuration] = useState('');
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});

  // ── Settings state ───────────────────────────────────────────────────────────
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  const [sendConfirmations, setSendConfirmations] = useState(true);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderHours, setReminderHours] = useState('24');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
      setOrgType(currentOrg.type);
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    if (currentOrg?.emailSettings) {
      setSendConfirmations(currentOrg.emailSettings.sendConfirmations);
      setSendReminders(currentOrg.emailSettings.sendReminders);
      setReminderHours(String(currentOrg.emailSettings.reminderHoursBefore));
    }
  }, [currentOrg?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function confirmDeleteTemplate(templateId: string, name: string) {
    Alert.alert(
      'Delete Template',
      `Remove "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(templateId) },
      ]
    );
  }

  async function handleCreateTemplate() {
    const errors: Record<string, string> = {};
    if (!templateName.trim()) errors.name = 'Template name is required';
    if (!templateEventTitle.trim()) errors.eventTitle = 'Event title is required';
    setTemplateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setTemplateSubmitting(true);
    try {
      await createTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        eventTitle: templateEventTitle.trim(),
        eventDescription: '',
        eventLocation: templateEventLocation.trim(),
        durationHours: templateDuration ? parseFloat(templateDuration) : undefined,
        slots: [],
      });
      setShowCreateTemplate(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateEventTitle('');
      setTemplateEventLocation('');
      setTemplateDuration('');
      setTemplateErrors({});
    } catch {
      // silently ignore; user can retry
    } finally {
      setTemplateSubmitting(false);
    }
  }

  async function handleSaveOrg() {
    if (!currentOrg) return;
    setOrgSaving(true);
    try {
      await updateOrganization(currentOrg.id, { name: orgName });
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 2000);
    } finally {
      setOrgSaving(false);
    }
  }

  async function handleSaveEmail() {
    if (!currentOrg) return;
    setEmailSaving(true);
    try {
      await updateOrganization(currentOrg.id, {
        emailSettings: {
          sendConfirmations,
          sendReminders,
          reminderHoursBefore: parseInt(reminderHours, 10) || 24,
        },
      });
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2000);
    } finally {
      setEmailSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Blue header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Reports & Settings</Text>
      </View>

      {/* Section tabs */}
      <View style={s.tabStrip}>
        {(['reports', 'templates', 'settings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, section === tab && s.tabActive]}
            onPress={() => setSection(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, section === tab && s.tabTextActive]}>
              {tab === 'reports' ? 'Reports' : tab === 'templates' ? 'Templates' : 'Settings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Reports section ── */}
      {section === 'reports' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Stat cards */}
          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>
                {reportLoading ? '…' : reportData?.totalSignups ?? '—'}
              </Text>
              <Text style={s.statLabel}>Total Signups</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>
                {reportLoading ? '…' : reportData?.totalCheckedIn ?? '—'}
              </Text>
              <Text style={s.statLabel}>Checked In</Text>
            </View>
          </View>

          {/* Events overview */}
          <Text style={s.sectionLabel}>Events Overview</Text>
          {events.length === 0 ? (
            <Text style={s.emptyText}>No events yet</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={s.eventCard}>
                <Text style={s.eventTitle}>{event.title}</Text>
                <Text style={s.eventDate}>{formatEventDate(event.startTime)}</Text>
                <Text style={s.eventLocation}>{event.location}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Templates section ── */}
      {section === 'templates' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Header row */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Templates</Text>
            <TouchableOpacity
              style={s.newBtn}
              onPress={() => setShowCreateTemplate(true)}
              activeOpacity={0.7}
            >
              <Text style={s.newBtnText}>New Template</Text>
            </TouchableOpacity>
          </View>

          {/* Create form */}
          {showCreateTemplate && (
            <View style={s.formCard}>
              <Text style={s.fieldLabel}>Template Name</Text>
              <TextInput
                style={[s.input, templateErrors.name ? s.inputError : null]}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="e.g. Standard Meet"
                placeholderTextColor="#9ca3af"
              />
              {templateErrors.name ? (
                <Text style={s.fieldError}>{templateErrors.name}</Text>
              ) : null}

              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                style={s.input}
                value={templateDescription}
                onChangeText={setTemplateDescription}
                placeholder="Optional description"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.fieldLabel}>Event Title</Text>
              <TextInput
                style={[s.input, templateErrors.eventTitle ? s.inputError : null]}
                value={templateEventTitle}
                onChangeText={setTemplateEventTitle}
                placeholder="e.g. Wrestling Meet"
                placeholderTextColor="#9ca3af"
              />
              {templateErrors.eventTitle ? (
                <Text style={s.fieldError}>{templateErrors.eventTitle}</Text>
              ) : null}

              <Text style={s.fieldLabel}>Event Location</Text>
              <TextInput
                style={s.input}
                value={templateEventLocation}
                onChangeText={setTemplateEventLocation}
                placeholder="e.g. Main Gym"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.fieldLabel}>Duration (hours)</Text>
              <TextInput
                style={s.input}
                value={templateDuration}
                onChangeText={setTemplateDuration}
                placeholder="e.g. 4"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />

              <View style={s.formActions}>
                <TouchableOpacity
                  style={[s.primaryBtn, s.formBtn, templateSubmitting ? s.primaryBtnDisabled : null]}
                  onPress={handleCreateTemplate}
                  disabled={templateSubmitting}
                  activeOpacity={0.8}
                >
                  {templateSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Save Template</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.outlineBtn, s.formBtn]}
                  onPress={() => {
                    setShowCreateTemplate(false);
                    setTemplateErrors({});
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Template list */}
          {templatesLoading ? (
            <ActivityIndicator style={s.loader} color="#1a56db" />
          ) : templates.length === 0 ? (
            <Text style={s.emptyText}>No templates yet. Tap 'New Template' to create one.</Text>
          ) : (
            templates.map((tmpl) => (
              <View key={tmpl.id} style={s.templateCard}>
                <View style={s.templateInfo}>
                  <Text style={s.templateName}>{tmpl.name}</Text>
                  <Text style={s.templateDescription} numberOfLines={1}>
                    {tmpl.description}
                  </Text>
                  <Text style={s.templateSlots}>{tmpl.slots.length} slots</Text>
                </View>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => confirmDeleteTemplate(tmpl.id, tmpl.name)}
                  activeOpacity={0.7}
                >
                  <Text style={s.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Settings section ── */}
      {section === 'settings' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Org settings card */}
          <View style={s.settingsCard}>
            <Text style={s.cardTitle}>Organization</Text>

            <Text style={s.fieldLabel}>Organization Name</Text>
            <TextInput
              style={s.input}
              value={orgName}
              onChangeText={setOrgName}
              placeholder="Organization name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={s.fieldLabel}>Organization Type</Text>
            <TextInput
              style={[s.input, s.orgTypeInput]}
              value={orgType}
              onChangeText={setOrgType}
              placeholder="e.g. Wrestling"
              placeholderTextColor="#9ca3af"
              editable={false}
            />
            <Text style={s.helperText}>Contact support to change organization type</Text>

            {orgSaved ? <Text style={s.savedMsg}>Saved!</Text> : null}

            <TouchableOpacity
              style={[s.primaryBtn, orgSaving ? s.primaryBtnDisabled : null]}
              onPress={handleSaveOrg}
              disabled={orgSaving}
              activeOpacity={0.8}
            >
              {orgSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.primaryBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Email settings card */}
          <View style={s.settingsCard}>
            <Text style={s.cardTitle}>Email Settings</Text>

            <View style={s.switchRow}>
              <Text style={s.fieldLabel}>Send Signup Confirmations</Text>
              <Switch
                value={sendConfirmations}
                onValueChange={setSendConfirmations}
                trackColor={{ false: '#d1d5db', true: '#1a56db' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={s.switchRow}>
              <Text style={s.fieldLabel}>Send Reminders</Text>
              <Switch
                value={sendReminders}
                onValueChange={setSendReminders}
                trackColor={{ false: '#d1d5db', true: '#1a56db' }}
                thumbColor="#ffffff"
              />
            </View>

            <Text style={s.fieldLabel}>Hours Before Event</Text>
            <TextInput
              style={[s.input, !sendReminders ? s.inputDisabled : null]}
              value={reminderHours}
              onChangeText={setReminderHours}
              placeholder="24"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              editable={sendReminders}
            />

            {emailSaved ? <Text style={s.savedMsg}>Saved!</Text> : null}

            <TouchableOpacity
              style={[s.primaryBtn, emailSaving ? s.primaryBtnDisabled : null]}
              onPress={handleSaveEmail}
              disabled={emailSaving}
              activeOpacity={0.8}
            >
              {emailSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.primaryBtnText}>Save Email Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // Header
  header: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Tab strip
  tabStrip: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1a56db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Section label
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  // New button
  newBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a56db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Event card
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Template card
  templateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  templateInfo: {
    flex: 1,
    gap: 3,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  templateDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  templateSlots: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '700',
  },

  // Settings cards
  settingsCard: {
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
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },

  // Form card (create template)
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  formBtn: {
    flex: 1,
    marginTop: 8,
  },

  // Shared form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  orgTypeInput: {
    backgroundColor: '#f3f4f6',
  },
  helperText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 3,
  },
  savedMsg: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  primaryBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },

  // Misc
  loader: {
    marginVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});
