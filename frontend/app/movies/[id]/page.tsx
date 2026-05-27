import { Suspense } from 'react';
import { MovieDetail } from '@/components/movies/movie-detail';
import { ReviewList } from '@/components/reviews/review-list';
import { WriteReview } from '@/components/reviews/write-review';

interface Props {
  params: { id: string };
}

export default function MoviePage({ params }: Props) {
  const movieId = parseInt(params.id, 10);

  return (
    <div className="container py-8 space-y-10">
      <Suspense fallback={<p className="text-muted-foreground">Loading movie...</p>}>
        <MovieDetail movieId={movieId} />
      </Suspense>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Reviews</h2>
        <WriteReview movieId={movieId} />
        <Suspense fallback={<p className="text-muted-foreground">Loading reviews...</p>}>
          <ReviewList movieId={movieId} />
        </Suspense>
      </section>
    </div>
  );
}
