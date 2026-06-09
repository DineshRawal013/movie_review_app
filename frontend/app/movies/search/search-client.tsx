'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '@/lib/api';
import { MovieCard } from '@/components/movies/movie-card';
import { MovieSearch } from '@/components/movies/movie-search';
import type { Movie } from '@/types/api';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const genreId = searchParams.get('genre') ? parseInt(searchParams.get('genre')!, 10) : undefined;
  const yearFrom = searchParams.get('yearFrom') ?? undefined;
  const yearTo = searchParams.get('yearTo') ?? undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['movies', 'search', q, genreId, yearFrom, yearTo],
    queryFn: () =>
      q
        ? moviesApi.search(q).then((r) => r.data)
        : moviesApi.list({ genreId }).then((r) => r.data),
    enabled: !!(q || genreId),
  });

  const movies: Movie[] = data?.results ?? data?.data ?? [];
  const filtered = movies.filter((m) => {
    if (yearFrom && m.releaseDate && new Date(m.releaseDate).getFullYear() < parseInt(yearFrom)) return false;
    if (yearTo && m.releaseDate && new Date(m.releaseDate).getFullYear() > parseInt(yearTo)) return false;
    return true;
  });

  if (!q && !genreId) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Use the search bar above or apply a genre filter to find movies.
      </p>
    );
  }

  if (isLoading) return <p className="text-muted-foreground">Searching...</p>;
  if (error) return <p className="text-destructive">Search failed. Please try again.</p>;

  if (!filtered.length) {
    return (
      <p className="text-muted-foreground">
        No movies found{q ? ` for "${q}"` : ''}{genreId ? ' with the selected genre' : ''}.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {filtered.map((movie) => (
        <MovieCard
          key={movie.tmdbId}
          movie={movie}
        />
      ))}
    </div>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const activeGenre = searchParams.get('genre') ? parseInt(searchParams.get('genre')!, 10) : undefined;
  const activeYearFrom = searchParams.get('yearFrom') ?? '';
  const activeYearTo = searchParams.get('yearTo') ?? '';

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const all = { q, genre: activeGenre?.toString(), yearFrom: activeYearFrom, yearTo: activeYearTo, ...updates };
    Object.entries(all).forEach(([k, v]) => { if (v) params.set(k, v); });
    return `/movies/search?${params.toString()}`;
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {q ? `Search results for "${q}"` : 'Browse Movies'}
        </h1>
        <MovieSearch />
      </div>

      {/* Filters */}
      <section aria-label="Filters" className="flex flex-wrap gap-4 items-end border rounded-lg p-4 bg-card">
        <div className="flex flex-col gap-1">
          <label htmlFor="genre-filter" className="text-xs font-medium text-muted-foreground">
            Genre
          </label>
          <select
            id="genre-filter"
            value={activeGenre ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              window.location.href = buildUrl({ genre: val || undefined });
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All genres</option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="year-from" className="text-xs font-medium text-muted-foreground">
            Year from
          </label>
          <input
            id="year-from"
            type="number"
            min={1900}
            max={2099}
            placeholder="e.g. 2000"
            defaultValue={activeYearFrom}
            onBlur={(e) => { window.location.href = buildUrl({ yearFrom: e.target.value || undefined }); }}
            className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="year-to" className="text-xs font-medium text-muted-foreground">
            Year to
          </label>
          <input
            id="year-to"
            type="number"
            min={1900}
            max={2099}
            placeholder="e.g. 2024"
            defaultValue={activeYearTo}
            onBlur={(e) => { window.location.href = buildUrl({ yearTo: e.target.value || undefined }); }}
            className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Active filter indicators */}
        <div className="flex flex-wrap gap-2 ml-auto items-center">
          {activeGenre && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
              {GENRES.find((g) => g.id === activeGenre)?.name ?? 'Genre'}
              <a
                href={buildUrl({ genre: undefined })}
                aria-label="Remove genre filter"
                className="hover:text-destructive ml-1"
              >
                ×
              </a>
            </span>
          )}
          {activeYearFrom && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
              From {activeYearFrom}
              <a href={buildUrl({ yearFrom: undefined })} aria-label="Remove year-from filter" className="hover:text-destructive ml-1">×</a>
            </span>
          )}
          {activeYearTo && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
              To {activeYearTo}
              <a href={buildUrl({ yearTo: undefined })} aria-label="Remove year-to filter" className="hover:text-destructive ml-1">×</a>
            </span>
          )}
        </div>
      </section>

      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}

export default function SearchClient() {
  return (
    <Suspense fallback={<div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
