const http = require('http');

const MOVIES = [
  {
    id: 550,
    title: 'Fight Club',
    overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
    release_date: '1999-10-15',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg',
    vote_average: 8.4,
    genres: [{ id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
  },
  {
    id: 238,
    title: 'The Godfather',
    overview: 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.',
    release_date: '1972-03-14',
    poster_path: '/3bhkrj58Vtu7enYsLegHnDmni2.jpg',
    backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    vote_average: 8.7,
    genres: [{ id: 80, name: 'Crime' }, { id: 18, name: 'Drama' }],
  },
];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const movieMatch = req.url?.match(/^\/3\/movie\/(\d+)/);
  if (movieMatch) {
    const movie = MOVIES.find((m) => m.id === parseInt(movieMatch[1], 10));
    if (movie) { res.end(JSON.stringify(movie)); return; }
    res.writeHead(404);
    res.end(JSON.stringify({ status_message: 'Not found' }));
    return;
  }

  if (req.url?.startsWith('/3/trending/movie')) {
    res.end(JSON.stringify({ page: 1, results: MOVIES, total_pages: 1, total_results: MOVIES.length }));
    return;
  }

  if (req.url?.startsWith('/3/search/movie')) {
    res.end(JSON.stringify({ page: 1, results: MOVIES, total_pages: 1, total_results: MOVIES.length }));
    return;
  }

  if (req.url?.startsWith('/3/genre/movie/list')) {
    const genres = [...new Set(MOVIES.flatMap((m) => m.genres))];
    res.end(JSON.stringify({ genres }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ status_message: 'Not found' }));
});

server.listen(4041, () => {
  console.log('Mock TMDB server running on :4041');
});
