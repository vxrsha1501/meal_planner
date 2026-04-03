/**
 * API utility — handles all communication with the Flask backend.
 * Uses the Vite proxy (/api → http://localhost:5000) in dev mode.
 */

const BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new Error('Cannot reach the backend server. Is Flask running on port 5000?');
  }

  // Try to parse JSON — handle empty or non-JSON responses gracefully
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

// ── User Endpoints ──

export async function setupUser(profile) {
  return request('/user/setup', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

export async function resetDaily(userId) {
  return request('/user/reset', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

// ── Meal Endpoints ──

export async function logMeal(userId, foodItem, quantity) {
  return request('/meal/log', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      food_item: foodItem,
      quantity: quantity,
    }),
  });
}

// ── Dashboard & Recommendations ──

export async function getDashboard(userId) {
  return request(`/dashboard?user_id=${userId}`);
}

export async function getRecommendations(userId) {
  return request(`/recommendations?user_id=${userId}`);
}

// ── Food Items ──

export async function getFoodItems() {
  return request('/food-items');
}
