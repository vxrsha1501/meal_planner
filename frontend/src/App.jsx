import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import WeeklyReport from './components/WeeklyReport';
import {
  getMe, login as apiLogin, signup as apiSignup, logout as apiLogout,
  getDashboard, getFoodItems, logMeal,
} from './api';
import './index.css';

/**
 * App — Root component with auth, routing, and layout.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [isLogging, setIsLogging] = useState(false);
  const navigate = useNavigate();

  // ── Check existing session on mount ──
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const data = await getMe();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch {
      // Not authenticated — that's fine
    } finally {
      setAuthChecked(true);
    }
  };

  // ── Load dashboard + food items when user is set ──
  useEffect(() => {
    if (user) {
      loadDashboard();
      loadFoodItems();
    }
  }, [user]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []);

  const loadFoodItems = async () => {
    try {
      const data = await getFoodItems();
      setFoodItems(data.food_items || []);
    } catch (err) {
      console.error('Food items load error:', err);
    }
  };

  // ── Auth handlers ──
  const handleLogin = async (username, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await apiLogin(username, password);
      setUser(result.user);
      navigate('/dashboard');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (userData) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await apiSignup(userData);
      setUser(result.user);
      navigate('/dashboard');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // Logout anyway
    }
    setUser(null);
    setDashboardData(null);
    setFoodItems([]);
    navigate('/login');
  };

  // ── Meal logging ──
  const handleLogMeal = async (mealType, items) => {
    setIsLogging(true);
    try {
      await logMeal(mealType, items);
      await loadDashboard();
    } catch (err) {
      console.error('Meal log error:', err);
    } finally {
      setIsLogging(false);
    }
  };

  // ── Loading screen while checking session ──
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-2xl mx-auto mb-4 animate-pulse-glow">
            🧠
          </div>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated → show login/signup ──
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} isLoading={authLoading} error={authError} />} />
        <Route path="/signup" element={<Signup onSignup={handleSignup} isLoading={authLoading} error={authError} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // ── Authenticated → sidebar layout with routes ──
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} onLogout={handleLogout} />

      <div className="main-content">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  data={dashboardData}
                  foodItems={foodItems}
                  onRefresh={loadDashboard}
                  onLogMeal={handleLogMeal}
                  isLogging={isLogging}
                />
              }
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="/weekly-report" element={<WeeklyReport />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
