'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moviesApi } from '@/lib/api';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { Movie, PaginatedResponse } from '@/types/api';
import { Metadata } from 'next';

const adminMoviesApi = {
  add: (tmdbId: number) => api.post('/admin/movies', { tmdbId }),
  sync: (tmdbId: number) => api.post(`/admin/movies/${tmdbId}/sync`),
  remove: (tmdbId: number) => api.delete(`/admin/movies/${tmdbId}`),
};

export default function AdminMoviesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const qc = useQueryClient();

  const { data: catalogueData, isLoading } = useQuery<PaginatedResponse<Movie>>({
    queryKey: ['admin', 'movies'],
    queryFn: () => moviesApi.list({ limit: 50 }).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (tmdbId: number) => adminMoviesApi.add(tmdbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      setSearchResults([]);
      setSearchQuery('');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (tmdbId: number) => adminMoviesApi.sync(tmdbId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'movies'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (tmdbId: number) => adminMoviesApi.remove(tmdbId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'movies'] }),
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await moviesApi.search(searchQuery.trim());
      setSearchResults(res.data?.results ?? []);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">Movie Management</h1>

      {/* Add Movie from TMDB */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add Movie from TMDB</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <label htmlFor="tmdb-search" className="sr-only">Search TMDB</label>
          <input
            id="tmdb-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TMDB for a movie..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((movie) => (
              <div key={movie.id} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">
                  {movie.title}
                  {movie.release_date ? ` (${new Date(movie.release_date).getFullYear()})` : ''}
                </span>
                <Button
                  size="sm"
                  onClick={() => addMutation.mutate(movie.id)}
                  disabled={addMutation.isPending}
                >
                  Add to Catalogue
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Existing Catalogue */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Catalogued Movies</h2>
        {isLoading && <p className="text-muted-foreground">Loading catalogue...</p>}
        {catalogueData?.data.map((movie) => (
          <div key={movie.tmdbId} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <span className="text-sm font-medium">{movie.title}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncMutation.mutate(movie.tmdbId)}
                disabled={syncMutation.isPending}
              >
                Refresh Metadata
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Remove "${movie.title}"? This will delete all associated reviews and ratings.`)) {
                    removeMutation.mutate(movie.tmdbId);
                  }
                }}
                disabled={removeMutation.isPending}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !catalogueData?.data.length && (
          <p className="text-muted-foreground">No movies in catalogue yet.</p>
        )}
      </section>
    </div>
  );
}
