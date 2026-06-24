import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VerifiedBadge from '../src/components/VerifiedBadge.jsx';

test('shows the badge for a verified, non-experimental pattern', () => {
  render(<VerifiedBadge pattern={{ verified: true, isExperimental: false }} />);
  expect(screen.getByText('Verified math')).toBeInTheDocument();
});

test('renders nothing for unverified or experimental patterns', () => {
  const { container, rerender } = render(<VerifiedBadge pattern={{ verified: false }} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<VerifiedBadge pattern={{ verified: true, isExperimental: true }} />);
  expect(container).toBeEmptyDOMElement();
});

test('compact variant still exposes an accessible "Verified math" label', () => {
  render(<VerifiedBadge pattern={{ verified: true }} compact />);
  expect(screen.getByText('Verified math')).toBeInTheDocument();
});
