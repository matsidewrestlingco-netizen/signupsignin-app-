jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../../components/StatusBadge';

describe('StatusBadge', () => {
  it('shows Open when empty', () => {
    const { getByText } = render(<StatusBadge quantityFilled={0} quantityTotal={10} />);
    expect(getByText('Open')).toBeTruthy();
  });

  it('shows Full when filled', () => {
    const { getByText } = render(<StatusBadge quantityFilled={10} quantityTotal={10} />);
    expect(getByText('Full')).toBeTruthy();
  });

  it('shows Filling when half full', () => {
    const { getByText } = render(<StatusBadge quantityFilled={5} quantityTotal={10} />);
    expect(getByText('Filling')).toBeTruthy();
  });

  it('shows No Slots when total is zero', () => {
    const { getByText } = render(<StatusBadge quantityFilled={0} quantityTotal={0} />);
    expect(getByText('No Slots')).toBeTruthy();
  });
});
