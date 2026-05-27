'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export function FlaggedReviews() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'flagged-reviews'],
    queryFn: () => adminApi.flaggedReviews().then((r) => r.data),
  });

  const hideMutation = useMutation({
    mutationFn: (id: string) => adminApi.hideReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flagged-reviews'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.restoreReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flagged-reviews'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flagged-reviews'] }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading flagged reviews...</p>;
  if (!data?.data.length) return <p className="text-muted-foreground">No flagged reviews.</p>;

  return (
    <div className="space-y-4">
      {data.data.map((review: any) => (
        <div key={review.id} className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{review.author?.displayName} · {formatDate(review.createdAt)}</p>
            <span className="text-xs text-muted-foreground">{review.flagCount} flags · status: {review.status}</span>
          </div>
          <p className="text-sm">{review.body}</p>
          <div className="flex gap-2">
            {review.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => hideMutation.mutate(review.id)}>
                Hide
              </Button>
            )}
            {review.status === 'hidden' && (
              <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate(review.id)}>
                Restore
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate(review.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
