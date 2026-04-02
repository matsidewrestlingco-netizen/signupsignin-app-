import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Event } from '../lib/types';
import { StatusBadge } from './StatusBadge';
import { formatEventDate } from '../lib/dateUtils';

interface EventCardProps {
  event: Event;
  totalSlots: number;
  filledSlots: number;
  onPress: () => void;
}

export function EventCard({ event, totalSlots, filledSlots, onPress }: EventCardProps) {
  const slotSummary =
    totalSlots === 0 ? 'No slots yet' : `${filledSlots} / ${totalSlots} slots filled`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <StatusBadge quantityFilled={filledSlots} quantityTotal={totalSlots} />
      </View>
      <Text style={styles.dateText}>{formatEventDate(event.startTime)}</Text>
      <Text style={styles.locationText}>{'📍 ' + event.location}</Text>
      <Text style={styles.slotText}>{slotSummary}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dateText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  slotText: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default EventCard;
