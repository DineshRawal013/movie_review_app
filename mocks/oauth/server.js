const http = require('http');

const PROFILE = {
  id: 'test-google-id-001',
  displayName: 'Test User',
  emails: [{ value: 'testuser@example.com' }],
  photos: [{ value: 'https://lh3.googleusercontent.com/test' }],
};

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url?.startsWith('/oauth2/v2/auth')) {
    res.writeHead(302, { Location: `http://localhost:3000/api/auth/google/callback?code=mock_code` });
    res.end();
    return;
  }

  if (req.url === '/token') {
    res.end(JSON.stringify({ access_token: 'mock_access_token', token_type: 'Bearer' }));
    return;
  }

  if (req.url === '/userinfo') {
    res.end(JSON.stringify(PROFILE));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(4040, () => {
  console.log('Mock OAuth server running on :4040');
});
