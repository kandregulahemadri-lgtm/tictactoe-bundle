const test = require('node:test');
const assert = require('node:assert/strict');
const { getCookieOptions } = require('../cookieOptions');

test('uses cross-site cookie settings for HTTPS requests from non-local hosts', () => {
  const req = {
    headers: {
      host: 'tictactoe-backend-e8us.onrender.com',
      'x-forwarded-proto': 'https',
    },
  };

  assert.deepStrictEqual(getCookieOptions(req), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
});

test('keeps localhost cookies less strict', () => {
  const req = {
    headers: {
      host: 'localhost:3000',
    },
    secure: false,
  };

  assert.deepStrictEqual(getCookieOptions(req), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });
});

test('uses cross-site cookie settings for browser requests that come from a public frontend origin', () => {
  const req = {
    headers: {
      origin: 'https://tictactoe-bundle.vercel.app',
      'sec-fetch-site': 'cross-site',
    },
    secure: false,
  };

  assert.deepStrictEqual(getCookieOptions(req), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
});
