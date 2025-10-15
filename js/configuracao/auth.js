export function getAuthToken() 
{
  try { return localStorage.getItem('authToken') || null; } catch (e) { return null; }
}

export function requireAuth({ redirectTo = '/login.html' } = {}) 
{
  const token = getAuthToken();

  if (!token) 
  {
    window.location.replace(redirectTo);
    return false;
  }

  return true;
}

export function clearAuth() 
{
  try { localStorage.removeItem('authToken'); } catch (e) {}
}
