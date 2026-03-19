export function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

export function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload) return false;
  if (!payload.exp) return false;
  return payload.exp * 1000 > Date.now();
}
