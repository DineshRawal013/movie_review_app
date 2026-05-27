import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { posterUrl } from '@/lib/utils';
import type { Movie } from '@/types/api';

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/movies/${movie.tmdbId}`}
      className="group rounded-lg overflow-hidden border bg-card hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-[2/3] bg-muted">
        <Image
          src={posterUrl(movie.posterPath)}
          alt={`${movie.title} poster`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{movie.title}</h3>
        {movie.releaseDate && (
          <span className="text-xs text-muted-foreground">
            {new Date(movie.releaseDate).getFullYear()}
          </span>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-star text-star" aria-hidden="true" />
          <span>{movie.avgRating > 0 ? movie.avgRating.toFixed(1) : 'N/A'}</span>
          <span>·</span>
          <span>{movie.ratingCount} ratings</span>
        </div>
      </div>
    </Link>
  );
}
