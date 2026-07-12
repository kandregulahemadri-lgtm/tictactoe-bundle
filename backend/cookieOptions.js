function isProductionRequest(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host || '';
  const isHttps = forwardedProto === 'https' || req.secure || host.includes('vercel.app') || host.includes('render.com') || host.includes('onrender.com');
  const isLocalHost = /localhost|127\.0\.0\.1|\.local|\.localhost/i.test(host);
  return isHttps && !isLocalHost;
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
