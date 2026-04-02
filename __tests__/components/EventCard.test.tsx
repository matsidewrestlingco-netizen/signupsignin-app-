jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EventCard } from '../../components/EventCard';

const mockEvent = {
  id: 'e1',
  title: 'Spring Tournament',
  startTime: new Date('2026-04-05T14:00:00'),
  location: 'Main Gym',
  description: 'Annual spring event',
  isPublic: true,
  createdAt: new Date(),
};

describe('EventCard', () => {
  it('renders event title and location', () => {
    const { getByText } = render(
      <EventCard event={mockEvent} totalSlots={10} filledSlots={3} onPress={() => {}} />
    );
    expect(getByText('Spring Tournament')).toBeTruthy();
    expect(getByText(/Main Gym/)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EventCard event={mockEvent} totalSlots={10} filledSlots={3} onPress={onPress} />
    );
    fireEvent.press(getByText('Spring Tournament'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows no slots text when totalSlots is 0', () => {
    const { getByText } = render(
      <EventCard event={mockEvent} totalSlots={0} filledSlots={0} onPress={() => {}} />
    );
    expect(getByText('No slots yet')).toBeTruthy();
  });
});
