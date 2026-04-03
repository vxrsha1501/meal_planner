import { useState, useEffect, useCallback } from 'react';
import ProfileForm from './components/ProfileForm';
import MealLogger from './components/MealLogger';
import Dashboard from './components/Dashboard';
import SuggestionsCard from './components/SuggestionsCard';
import { setupUser, logMeal, getDashboard, getFoodItems, resetDaily } from './api';
import './index.css';

/**
 * App — Root component orchestrating the full workflow:
 *   1. Profile setup (if no user)
 *   2. Dashboard + Meal Logger + Suggestions (after setup)
 *
 * State is lifted here and passed down to child components.
 */
export default function App() {
  // ── State ──
  const [userId, setUserId] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch dashboard data ──
  const refreshDashboard = useCallback(async (uid) => {
    try {
      const data = await getDashboard(uid);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── Load food items on mount ──
  useEffect(() => {
    async function loadFoodItems() {
      try {
        const data = await getFoodItems();
        setFoodItems(data.food_items || []);
      } catch (err) {
        console.error('Failed to load food items:', err);
        // Backend might not be running yet — fail silently
      }
    }
    loadFoodItems();
  }, []);

  // ── Profile setup handler ──
  const handleProfileSubmit = async (profile) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await setupUser(profile);
      setUserId(result.user_id);
      await refreshDashboard(result.user_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Meal log handler ──
  const handleLogMeal = async (foodItem, quantity) => {
    if (!userId) return;
    setIsLogging(true);
    setError(null);
    try {
      await logMeal(userId, foodItem, quantity);
      // Refresh dashboard to get updated totals + new recommendations
      await refreshDashboard(userId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLogging(false);
    }
  };

  // ── Reset daily counters ──
  const handleReset = async () => {
    if (!userId) return;
    try {
      await resetDaily(userId);
      await refreshDashboard(userId);
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Back to setup ──
  const handleBackToSetup = () => {
    setUserId(null);
    setDashboardData(null);
    setError(null);
  };

  // ── Render ──

  // Show profile form if no user
  if (!userId) {
    return (
      <>
        <ProfileForm onSubmit={handleProfileSubmit} isLoading={isLoading} />
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      </>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-lg">
              🧠
            </div>
            <h1 className="text-lg font-bold gradient-text hidden sm:block">
              Lifestyle Planner
            </h1>
          </div>
          <button onClick={handleBackToSetup} className="btn-secondary text-xs" id="btn-new-profile">
            ← New Profile
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Meal Logger */}
          <div className="lg:col-span-4 space-y-6">
            <MealLogger
              foodItems={foodItems}
              onLog={handleLogMeal}
              isLogging={isLogging}
            />
          </div>

          {/* Middle Column: Dashboard */}
          <div className="lg:col-span-4 space-y-6">
            <Dashboard
              data={dashboardData}
              onReset={handleReset}
            />
          </div>

          {/* Right Column: Suggestions */}
          <div className="lg:col-span-4 space-y-6">
            <SuggestionsCard
              recommendations={dashboardData?.recommendations}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12 py-6">
        <p className="text-center text-xs text-slate-600">
          AI Budget-Aware Lifestyle Planner · Built for Hackathon 2026
        </p>
      </footer>
    </div>
  );
}

/* ── Error Banner ── */
function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm animate-fade-in-up">
      <div className="bg-rose-500/15 border border-rose-500/30 backdrop-blur-lg rounded-xl p-4 flex items-start gap-3">
        <span className="text-rose-400 text-lg">⚠️</span>
        <div className="flex-1">
          <p className="text-sm text-rose-300">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-300 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
