import { Metadata } from 'next';
import { FlaggedReviews } from '@/components/admin/flagged-reviews';

export const metadata: Metadata = { title: 'Review Moderation' };

export default function ModerationPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Flagged Reviews</h1>
      <FlaggedReviews />
    </div>
  );
}
