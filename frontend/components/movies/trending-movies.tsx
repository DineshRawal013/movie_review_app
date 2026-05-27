'use client';

import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '@/lib/api';
import { MovieCard } from './movie-card';
import type { Movie } from '@/types/api';

export function TrendingMovies() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['movies', 'trending'],
    queryFn: () => moviesApi.trending().then((r) => r.data),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading trending movies...</p>;
  if (error) return <p className="text-destructive">Failed to load trending movies.</p>;

  const movies: Movie[] = data?.results ?? [];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {movies.slice(0, 10).map((movie) => (
        <MovieCard key={movie.id ?? movie.tmdbId} movie={{ ...movie, tmdbId: movie.id ?? movie.tmdbId }} />
      ))}
    </div>
  );
}
