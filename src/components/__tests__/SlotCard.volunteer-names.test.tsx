import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotCard } from '../SlotCard';

const baseSlot = {
  id: 'slot1',
  name: 'Scorer',
  category: 'Officials',
  quantityTotal: 3,
  quantityFilled: 2,
  description: '',
  createdAt: new Date(),
};

describe('SlotCard volunteer names', () => {
  it('renders each volunteer name when volunteerNames is provided', () => {
    render(
      <SlotCard
        slot={baseSlot}
        volunteerNames={['Daniel Emmons', 'Sarah Johnson']}
      />
    );
    expect(screen.getByText('Daniel Emmons')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
  });

  it('renders nothing extra when volunteerNames is empty', () => {
    const { container } = render(
      <SlotCard slot={baseSlot} volunteerNames={[]} />
    );
    // The names section should not exist
    expect(container.querySelector('[data-testid="volunteer-names"]')).toBeNull();
  });

  it('renders nothing extra when volunteerNames is omitted', () => {
    const { container } = render(<SlotCard slot={baseSlot} />);
    expect(container.querySelector('[data-testid="volunteer-names"]')).toBeNull();
  });
});
