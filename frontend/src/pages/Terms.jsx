import React from 'react';
import StaticPage from '../components/StaticPage';

// Legal boilerplate for launch — review with counsel before scaling.
export default function Terms() {
  return (
    <StaticPage
      title="Terms of Service"
      description="The terms that govern your use of Loopsy."
      updated="July 2026"
    >
      <p>
        Welcome to Loopsy. These Terms of Service ("Terms") govern your use of the Loopsy
        website, apps, and services (together, the "Service"). By creating an account or
        using the Service you agree to these Terms.
      </p>

      <h2>1. Your account</h2>
      <p>
        You need an account for most features. Keep your credentials secure — you are
        responsible for activity under your account. You must provide accurate information
        and be at least 13 years old (or the minimum age in your jurisdiction).
      </p>

      <h2>2. Your content</h2>
      <p>
        You own the patterns, designs, and other content you create. When you <strong>publish</strong> a
        pattern to the community, you grant Loopsy a non-exclusive, worldwide license to
        host, display, and distribute it within the Service (including share previews),
        and you grant other users the right to view it and make the item for personal use.
        Unpublishing ends future display but copies already saved by other makers remain in
        their projects. Don't publish content you don't have rights to.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>No unlawful, infringing, hateful, or harassing content or behaviour.</li>
        <li>No attempts to disrupt, overload, reverse-engineer, or bypass limits of the Service.</li>
        <li>No scraping or bulk-extracting content or user data.</li>
      </ul>
      <p>We may remove content or suspend accounts that violate these Terms.</p>

      <h2>4. AI-generated patterns</h2>
      <p>
        Loopsy computes stitch counts with a deterministic engine and independently
        re-checks them; patterns that pass earn the "Verified math" badge. Patterns marked
        <strong> experimental</strong> are AI-written without that guarantee. Finished dimensions always
        depend on your yarn, hook, and personal tension — results may vary. The Service is
        provided for craft purposes; use good judgment with materials and tools.
      </p>

      <h2>5. Subscriptions & billing</h2>
      <p>
        Paid plans are billed through Stripe on a recurring basis until cancelled. You can
        cancel any time via the billing portal in your Account page; access continues to the
        end of the paid period. Prices and plan features may change with notice. Usage
        limits (such as AI generations) reset monthly and don't roll over.
      </p>

      <h2>6. Disclaimers & liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. To the maximum
        extent permitted by law, Loopsy is not liable for indirect, incidental, or
        consequential damages, and our total liability is limited to the amount you paid us
        in the twelve months before the claim.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using the Service or delete your account at any time by contacting us.
        We may suspend or terminate accounts that breach these Terms.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms; material changes will be announced in the Service.
        Continued use after changes take effect means you accept them.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? <a href="mailto:hello@loopsy.app">hello@loopsy.app</a>
      </p>
    </StaticPage>
  );
}
