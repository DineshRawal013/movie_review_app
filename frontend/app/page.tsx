import { Suspense } from 'react';
import { TrendingMovies } from '@/components/movies/trending-movies';
import { MovieSearch } from '@/components/movies/movie-search';

export default function HomePage() {
  return (
    <div className="container py-8 space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Discover & Review Movies</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Rate films, share your thoughts, and explore what the world is watching.
        </p>
        <MovieSearch />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Trending This Week</h2>
        <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
          <TrendingMovies />
        </Suspense>
      </section>
    </div>
  );
}
