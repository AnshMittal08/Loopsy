import React from 'react';
import StaticPage from '../components/StaticPage';

// Legal boilerplate for launch — review with counsel before scaling.
export default function Privacy() {
  return (
    <StaticPage
      title="Privacy Policy"
      description="What Loopsy collects, what it never stores, and your choices."
      updated="July 2026"
    >
      <p>
        This policy explains what we collect, why, and the choices you have. The short
        version: we collect what the product needs to work, we don't sell your data, and
        photos you analyze with Vision Studio are <strong>never stored</strong>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email, display name, and a securely hashed password.</li>
        <li><strong>Your work:</strong> patterns, designs, project progress, collections, comments, stars, and learning progress — so they sync across your devices.</li>
        <li><strong>Usage counts:</strong> how many AI generations/analyses you've used, to enforce plan limits.</li>
        <li><strong>Basic logs:</strong> standard server logs (IP, timestamps) for security and abuse prevention, including login rate-limiting.</li>
      </ul>

      <h2>What we deliberately do NOT keep</h2>
      <ul>
        <li><strong>Vision Studio photos:</strong> images you upload for analysis are sent for AI processing and discarded — they are never written to our storage.</li>
        <li>We don't sell or rent personal data, and we don't run third-party advertising trackers.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a single first-party session cookie (<code>loopsy_session</code>) to keep you
        signed in, plus a local preference for your theme. No cross-site tracking cookies.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li><strong>Stripe</strong> — payment processing (we never see your full card number).</li>
        <li><strong>Anthropic</strong> — AI processing of your prompts and Vision photos to generate patterns.</li>
        <li><strong>Resend</strong> — transactional email (verification, password reset).</li>
        <li>Hosting infrastructure (app, database) under standard data-processing terms.</li>
      </ul>

      <h2>Your choices & rights</h2>
      <ul>
        <li>Edit your profile from your Account page; unpublish patterns at any time.</li>
        <li>Request a copy or deletion of your data by emailing us — we'll act within 30 days.</li>
        <li>Depending on where you live (e.g. EU/UK GDPR, California CCPA) you may have additional rights of access, correction, portability, and erasure — the same email honours them.</li>
      </ul>

      <h2>Security & retention</h2>
      <p>
        Passwords are hashed with scrypt; destructive actions are audit-logged; deleted
        patterns are soft-deleted (recoverable briefly) then purged. We keep data only as
        long as your account is active or the law requires.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests: <a href="mailto:hello@loopsy.app">hello@loopsy.app</a>
      </p>
    </StaticPage>
  );
}
