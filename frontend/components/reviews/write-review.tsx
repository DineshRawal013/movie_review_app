'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, usersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

const MAX_CHARS = 500;

export function WriteReview({ movieId }: { movieId: number }) {
  const [body, setBody] = useState('');
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => reviewsApi.create(movieId, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', movieId] });
      setBody('');
      setOpen(false);
    },
  });

  const remaining = MAX_CHARS - body.length;
  const overLimit = remaining < 0;

  if (!me) {
    return (
      <p className="text-sm text-muted-foreground mb-4">
        <a href="/login" className="underline hover:text-foreground">Sign in</a> to write a review.
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="mb-4">
        Write a Review
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        if (overLimit) return;
        mutation.mutate();
      }}
      className="rounded-lg border bg-card p-4 space-y-3 mb-6"
    >
      <h3 className="font-semibold">Your Review</h3>

      <div>
        <label htmlFor="review-content" className="sr-only">Review content</label>
        <textarea
          id="review-content"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts about this movie..."
          rows={4}
          required
          maxLength={MAX_CHARS}
          aria-describedby="char-counter"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
        <p
          id="char-counter"
          className={`text-xs mt-1 ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          {remaining} characters remaining
        </p>
      </div>

      {!body.trim() && mutation.isError && (
        <p className="text-sm text-destructive" role="alert">Review text cannot be blank.</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending || overLimit || !body.trim()}>
          {mutation.isPending ? 'Submitting...' : 'Submit Review'}
        </Button>
        <Button type="button" variant="outline" onClick={() => { setOpen(false); setBody(''); }}>
          Cancel
        </Button>
      </div>

      {mutation.isError && body.trim() && (
        <p className="text-sm text-destructive" role="alert">
          Failed to submit review. You may have already reviewed this movie.
        </p>
      )}
    </form>
  );
}
