'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { moviesApi, ratingsApi } from '@/lib/api';
import { posterUrl, backdropUrl, formatDate } from '@/lib/utils';
import { StarRating } from './star-rating';
import type { Movie } from '@/types/api';

export function MovieDetail({ movieId }: { movieId: number }) {
  const { data: movie, isLoading, error } = useQuery<Movie>({
    queryKey: ['movie', movieId],
    queryFn: () => moviesApi.get(movieId).then((r) => r.data),
  });

  const { data: userRating } = useQuery({
    queryKey: ['rating', movieId],
    queryFn: () => ratingsApi.get(movieId).then((r) => r.data),
    retry: false,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading movie details...</p>;
  if (error || !movie) return <p className="text-destructive">Movie not found.</p>;

  const backdrop = backdropUrl(movie.backdropPath);

  return (
    <div className="space-y-6">
      {backdrop && (
        <div className="relative h-64 rounded-xl overflow-hidden">
          <Image src={backdrop} alt="" fill className="object-cover opacity-60" aria-hidden="true" />
        </div>
      )}

      <div className="flex gap-6">
        <div className="relative w-32 h-48 flex-shrink-0 rounded-lg overflow-hidden border">
          <Image
            src={posterUrl(movie.posterPath)}
            alt={`${movie.title} poster`}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          {movie.releaseDate && (
            <p className="text-muted-foreground text-sm">{formatDate(movie.releaseDate)}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {movie.genres?.map(({ genre }) => (
              <span
                key={genre.id}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {genre.name}
              </span>
            ))}
          </div>
          <p className="text-sm leading-relaxed max-w-2xl">{movie.overview}</p>

          <dl className="space-y-1 text-sm">
            {movie.runtime != null && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground font-medium">Runtime</dt>
                <dd>{movie.runtime} min</dd>
              </div>
            )}
            {movie.director != null && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground font-medium">Director</dt>
                <dd>{movie.director}</dd>
              </div>
            )}
            {movie.castJson != null && movie.castJson.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground font-medium">Cast</dt>
                <dd>{movie.castJson.slice(0, 5).join(', ')}</dd>
              </div>
            )}
          </dl>

          {movie.trailerUrl != null && (
            <a
              href={movie.trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Watch Trailer
            </a>
          )}

          <StarRating movieId={movieId} current={userRating?.value} avg={movie.avgRating} count={movie.ratingCount} />
        </div>
      </div>
    </div>
  );
}
