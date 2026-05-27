'use client';

import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api';
import { ReviewCard } from './review-card';
import type { PaginatedResponse, Review } from '@/types/api';

export function ReviewList({ movieId }: { movieId: number }) {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Review>>({
    queryKey: ['reviews', movieId],
    queryFn: () => reviewsApi.list(movieId).then((r) => r.data),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading reviews...</p>;
  if (error) return <p className="text-destructive">Failed to load reviews.</p>;
  if (!data?.data.length) return <p className="text-muted-foreground">No reviews yet. Be the first!</p>;

  return (
    <div className="space-y-4 mt-4">
      {data.data.map((review) => (
        <ReviewCard key={review.id} review={review} movieId={movieId} />
      ))}
    </div>
  );
}
