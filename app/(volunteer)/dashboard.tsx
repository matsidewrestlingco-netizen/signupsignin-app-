import { View, Text, StyleSheet } from 'react-native';

export default function VolunteerDashboard() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Volunteer Dashboard</Text>
      <Text style={s.sub}>Coming in Phase 2</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  t: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    color: '#6b7280',
    marginTop: 8,
  },
});
