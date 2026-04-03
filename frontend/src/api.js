/**
 * API utility — handles all communication with the FastAPI backend.
 * Uses the Vite proxy (/api → http://localhost:8000) in dev mode.
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
    throw new Error('Cannot reach the backend server. Is FastAPI running on port 8000?');
  }

  let data;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Backend returned non-JSON response (status ${response.status}). ` +
      'Make sure the FastAPI server is running.'
    );
  }

  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed with status ${response.status}`);
  }

  return data;
}

async function uploadRequest(endpoint, formData) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed with status ${response.status}`);
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

// ── AI & OCR ──

export async function askMealAssistant(query) {
  return request('/ai/meal-query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function getWorkoutPlan(workoutPreference, notes = '') {
  return request('/ai/workout-plan', {
    method: 'POST',
    body: JSON.stringify({ workout_preference: workoutPreference, notes }),
  });
}

export async function scanMealImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  return uploadRequest('/ai/meal-scan', formData);
}

export async function scanReceipt(file) {
  const formData = new FormData();
  formData.append('file', file);
  return uploadRequest('/receipt/scan', formData);
}

// ── Challenges ──

export async function createChallenge(payload) {
  return request('/challenges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getChallenges() {
  return request('/challenges');
}

export async function joinChallenge(challengeId) {
  return request(`/challenges/${challengeId}/join`, {
    method: 'POST',
  });
}

export async function getMyChallenges() {
  return request('/challenges/me');
}
