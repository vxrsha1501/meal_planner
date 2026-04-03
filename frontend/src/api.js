/**
 * API utility — handles all communication with the Flask backend.
 * Uses the Vite proxy (/api → http://localhost:5000) in dev mode.
 * All requests include credentials for session cookies.
 */

const BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling and session support.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new Error('Cannot reach the backend server. Is Flask running on port 5000?');
  }

  let data;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Backend returned non-JSON response (status ${response.status}). ` +
      'Make sure the Flask server is running.'
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ── Auth Endpoints ──

export async function signup(userData) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function login(username, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return request('/logout', { method: 'POST' });
}

export async function getMe() {
  return request('/me');
}

// ── Profile Endpoints ──

export async function getProfile() {
  return request('/profile');
}

export async function changePassword(currentPassword, newPassword) {
  return request('/profile/password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// ── Dashboard ──

export async function getDashboard() {
  return request('/dashboard');
}

// ── Meal Endpoints ──

export async function logMeal(mealType, items) {
  return request('/meal/log', {
    method: 'POST',
    body: JSON.stringify({ meal_type: mealType, items }),
  });
}

export async function getFoodItems() {
  return request('/food-items');
}

// ── Budget ──

export async function updateBudget(amount) {
  return request('/budget/update', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

// ── Recommendations ──

export async function getRecommendations() {
  return request('/recommendations');
}

// ── Workout ──

export async function logWorkout(activity, duration, description) {
  return request('/workout/log', {
    method: 'POST',
    body: JSON.stringify({ activity, duration, description }),
  });
}

// ── Weekly Report ──

export async function getWeeklyReport() {
  return request('/weekly-report');
}
