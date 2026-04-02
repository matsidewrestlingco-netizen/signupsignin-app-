import { Text, View, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  quantityFilled: number;
  quantityTotal: number;
}

type StatusConfig = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

function getStatus(quantityFilled: number, quantityTotal: number): StatusConfig {
  if (quantityTotal === 0) {
    return { label: 'No Slots', backgroundColor: '#e5e7eb', textColor: '#6b7280' };
  }
  if (quantityFilled >= quantityTotal) {
    return { label: 'Full', backgroundColor: '#fee2e2', textColor: '#991b1b' };
  }
  if (quantityFilled / quantityTotal >= 0.5) {
    return { label: 'Filling', backgroundColor: '#fef3c7', textColor: '#92400e' };
  }
  return { label: 'Open', backgroundColor: '#d1fae5', textColor: '#065f46' };
}

export function StatusBadge({ quantityFilled, quantityTotal }: StatusBadgeProps) {
  const status = getStatus(quantityFilled, quantityTotal);

  return (
    <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
      <Text style={[styles.label, { color: status.textColor }]}>{status.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default StatusBadge;
