'use client';

import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Flag, Star, Trash2 } from 'lucide-react';
import type { Review } from '@/types/api';

interface Props {
  review: Review;
  movieId: number;
}

export function ReviewCard({ review, movieId }: Props) {
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => reviewsApi.delete(review.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', movieId] }),
  });

  const flagMutation = useMutation({
    mutationFn: () => reviewsApi.flag(review.id, 'Inappropriate content'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', movieId] }),
  });

  const author = review.user ?? review.author;
  const isOwner = me?.id === author?.id;

  return (
    <article className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {author?.avatarUrl && (
            <Image
              src={author.avatarUrl}
              alt={author.displayName}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium">{author?.displayName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        {review.updatedAt !== review.createdAt && (
          <span className="text-xs text-muted-foreground italic">edited</span>
        )}
      </div>

      <p className="text-sm leading-relaxed">{review.body}</p>

      <div className="flex gap-2 justify-end">
        {!isOwner && me && (
          <button
            onClick={() => flagMutation.mutate()}
            disabled={flagMutation.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Flag review"
          >
            <Flag className="h-3 w-3" />
            Flag
          </button>
        )}
        {(isOwner || me?.role === 'admin') && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete review"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
