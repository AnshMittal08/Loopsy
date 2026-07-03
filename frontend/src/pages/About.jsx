import React from 'react';
import StaticPage from '../components/StaticPage';

export default function About() {
  return (
    <StaticPage
      title="About Loopsy"
      description="The AI-native crochet studio where stitch counts are computed, never guessed."
    >
      <p>
        Loopsy exists because crochet patterns shouldn't be a leap of faith. Describe what
        you want to make — or photograph it, or sketch it on a canvas — and Loopsy turns it
        into a complete, row-by-row pattern.
      </p>
      <h2>Computed, never guessed</h2>
      <p>
        The heart of Loopsy is a deterministic geometry engine. When you ask for a 6&nbsp;cm
        sphere, the engine converts real dimensions into exact rounds and stitch counts
        using the same textbook math experienced designers use — and then a second,
        independent validator re-derives every count from the written instructions. Only
        when both agree does a pattern earn the <strong>Verified math ✓</strong> badge. AI writes the
        friendly words around the numbers; it is never allowed to invent the numbers.
      </p>
      <h2>Make, learn, share</h2>
      <p>
        Track any pattern stitch-by-stitch in the project tracker, learn techniques in the
        Learning Centre, design free-form creatures on the canvas, and publish your makes
        to the community for other makers to save and follow.
      </p>
      <h2>Get in touch</h2>
      <p>
        We're a small team that loves yarn and arithmetic in equal measure. Say hello at{' '}
        <a href="mailto:hello@loopsy.app">hello@loopsy.app</a>.
      </p>
    </StaticPage>
  );
}
