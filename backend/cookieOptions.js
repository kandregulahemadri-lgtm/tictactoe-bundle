function isProductionRequest(req) {
  const forwardedProto = req.headers?.['x-forwarded-proto'] || req.headers?.['x-forwarded-protocol'];
  const forwardedSsl = req.headers?.['x-forwarded-ssl'];
  const host = String(req.headers?.host || req.headers?.Host || '');
  const origin = String(req.headers?.origin || req.headers?.Origin || '');

  let originHost = '';
  try {
    originHost = new URL(origin).hostname;
  } catch (_) {
    originHost = '';
  }

  const normalizedHost = host.toLowerCase();
  const normalizedOriginHost = originHost.toLowerCase();
  const isHttps = forwardedProto === 'https' || forwardedSsl === 'on' || req.secure || /^https:\/\//i.test(origin);
  const isLocalHost = /localhost|127\.0\.0\.1|\.local|\.localhost/i.test(normalizedHost)
    || /localhost|127\.0\.0\.1|\.local|\.localhost/i.test(normalizedOriginHost);
  const isPublicDeploymentHost = /vercel\.app|render\.com|onrender\.com|railway\.app|netlify\.app|fly\.dev/i.test(normalizedHost)
    || /vercel\.app|render\.com|onrender\.com|railway\.app|netlify\.app|fly\.dev/i.test(normalizedOriginHost);

  return isHttps && (!isLocalHost || isPublicDeploymentHost);
}

function getCookieOptions(req) {
  const isProduction = isProductionRequest(req);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

module.exports = {
  getCookieOptions,
};
