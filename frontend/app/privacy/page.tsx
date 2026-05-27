import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="container py-8 max-w-3xl prose dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>Last updated: 2026-05-24</p>
      <p>
        CineRate collects your Google account information (name, email, profile picture) solely to
        provide personalised features such as ratings and reviews. We do not sell your data to third
        parties.
      </p>
      <h2>Data Deletion</h2>
      <p>
        You may delete your account at any time from your profile settings. Deletion removes all
        personal data in a single transaction within 30 seconds.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy enquiries email{' '}
        <a href="mailto:privacy@cinerate.example.com">privacy@cinerate.example.com</a>.
      </p>
    </div>
  );
}
