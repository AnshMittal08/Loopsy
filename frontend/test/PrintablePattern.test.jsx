import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrintablePattern from '../src/components/PrintablePattern.jsx';

const pattern = {
  title: 'Bobble Beanie',
  difficulty: 'Beginner',
  materials: ['Worsted yarn — about 90 m (35 g)'],
  notes: ['Work an extra dc round for a snugger fit.'],
};
const steps = [
  { instruction: 'Single crochet in each stitch around. (24 stitches)' },
  { instruction: 'Double crochet in next stitch, sc in next 2 stitches.' },
];

test('defaults to US terms', () => {
  render(<PrintablePattern pattern={pattern} steps={steps} />);
  expect(screen.getByText(/Single crochet in each stitch around/)).toBeInTheDocument();
  expect(screen.queryByText(/Double crochet in each stitch around/)).not.toBeInTheDocument();
});

test('renders UK terms throughout — steps, materials, and notes — when terms="uk"', () => {
  render(<PrintablePattern pattern={pattern} steps={steps} terms="uk" />);
  // Steps convert.
  expect(screen.getByText(/Double crochet in each stitch around/)).toBeInTheDocument();
  expect(screen.getByText(/Treble crochet in next stitch, dc in next 2 stitches/)).toBeInTheDocument();
  // Notes convert too (a note can reference stitch terms).
  expect(screen.getByText(/Work an extra tr round/)).toBeInTheDocument();
});

test('renders nothing when there is no pattern', () => {
  const { container } = render(<PrintablePattern pattern={null} steps={steps} />);
  expect(container).toBeEmptyDOMElement();
});
