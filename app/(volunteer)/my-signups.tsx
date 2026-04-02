import { View, Text, StyleSheet } from 'react-native';

export default function MySignups() {
  return (
    <View style={s.c}>
      <Text style={s.t}>My Signups</Text>
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
});
