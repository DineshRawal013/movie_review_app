export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Genre {
  id: number;
  tmdbId: number;
  name: string;
}

export interface Movie {
  id: number;
  tmdbId: number;
  title: string;
  overview?: string;
  releaseDate?: string;
  posterPath?: string;
  backdropPath?: string;
  avgRating: number;
  ratingCount: number;
  genres: Array<{ genre: Genre }>;
  runtime?: number | null;
  director?: string | null;
  castJson?: string[] | null;
  trailerUrl?: string | null;
}

export interface Review {
  id: string;
  body: string;
  isHidden: boolean;
  flagCount: number;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  /** @deprecated Use user field. Legacy alias kept for backward compat during transition. */
  author?: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
}

export interface Rating {
  id: string;
  value: number;
  movieId: number;
  userId: string;
}

export interface ReviewFlag {
  id: string;
  reviewId: string;
  userId: string;
  reason: string;
  createdAt: string;
}
