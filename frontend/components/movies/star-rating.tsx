'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingsApi } from '@/lib/api';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  movieId: number;
  current?: number;
  avg: number;
  count: number;
}

export function StarRating({ movieId, current, avg, count }: Props) {
  const [hover, setHover] = useState(0);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (value: number) =>
      current === value
        ? ratingsApi.delete(movieId)
        : ratingsApi.upsert(movieId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rating', movieId] });
      qc.invalidateQueries({ queryKey: ['movie', movieId] });
    },
  });

  const displayed = hover || current || 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1" role="group" aria-label="Rate this movie out of 5">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            onClick={() => mutation.mutate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            aria-label={`Rate ${star} out of 5`}
            aria-pressed={current === star}
            className="focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                star <= displayed ? 'fill-star text-star' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Avg: {avg > 0 ? Number(avg).toFixed(1) : 'N/A'} / 5 · {count} ratings
        {current ? ` · Your rating: ${current}/5` : ''}
      </p>
    </div>
  );
}
