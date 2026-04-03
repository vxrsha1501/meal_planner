import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Login from './components/Login';
import Signup from './components/Signup';
import useAuthStore from './store/authStore';
import {
  getMe, login as apiLogin, signup as apiSignup, logout as apiLogout,
  getDashboard, getFoodItems, logMeal,
} from './api';
import './index.css';

const Sidebar = lazy(() => import('./components/Sidebar'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const WorkoutPlanner = lazy(() => import('./components/WorkoutPlanner'));
const Profile = lazy(() => import('./components/Profile'));
const WeeklyReport = lazy(() => import('./components/WeeklyReport'));

/**
 * App — Root component with auth, routing, and layout.
 */
export default function App() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (meQuery.data?.authenticated) {
      setUser(meQuery.data.user);
    } else if (meQuery.isSuccess) {
      clearUser();
    }
  }, [meQuery.data, meQuery.isSuccess, setUser, clearUser]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });

  const foodItemsQuery = useQuery({
    queryKey: ['food-items'],
    queryFn: getFoodItems,
    enabled: !!user,
    select: (data) => data.food_items || [],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });

  // ── Auth handlers ──
  const loginMutation = useMutation({
    mutationFn: ({ username, password }) => apiLogin(username, password),
    onSuccess: (result) => {
      setUser(result.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
      navigate('/dashboard');
    },
  });

  const signupMutation = useMutation({
    mutationFn: (userData) => apiSignup(userData),
    onSuccess: (result) => {
      setUser(result.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
      navigate('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      clearUser();
      queryClient.removeQueries({ queryKey: ['dashboard'] });
      queryClient.removeQueries({ queryKey: ['food-items'] });
      navigate('/login');
    },
  });

  const mealMutation = useMutation({
    mutationFn: ({ mealType, items }) => logMeal(mealType, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleLogin = async (username, password) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const handleSignup = async (userData) => {
    await signupMutation.mutateAsync(userData);
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  // ── Meal logging ──
  const handleLogMeal = async (mealType, items) => {
    await mealMutation.mutateAsync({ mealType, items });
  };

  const routeLoadingFallback = (
    <div className="bento-skeleton-grid">
      <div className="bento-skeleton tile-span-8" />
      <div className="bento-skeleton tile-span-4" />
      <div className="bento-skeleton tile-span-12" />
    </div>
  );

  // ── Loading screen while checking session ──
  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <div className="bento-skeleton-grid">
          <div className="bento-skeleton tile-span-8" />
          <div className="bento-skeleton tile-span-4" />
          <div className="bento-skeleton tile-span-12" />
          <div className="bento-skeleton tile-span-6" />
          <div className="bento-skeleton tile-span-6" />
        </div>
      </div>
    );
  }

  // ── Not authenticated → show login/signup ──
  if (!user) {
    const authError = loginMutation.error?.message || signupMutation.error?.message || null;
    const authLoading = loginMutation.isPending || signupMutation.isPending;

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
      <Suspense fallback={routeLoadingFallback}>
        <Sidebar onLogout={handleLogout} />
      </Suspense>

      <div className="main-content">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
          <Suspense fallback={routeLoadingFallback}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    data={dashboardQuery.data}
                    foodItems={foodItemsQuery.data || []}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
                    onLogMeal={handleLogMeal}
                    isLogging={mealMutation.isPending}
                  />
                }
              />
              <Route path="/workout" element={<WorkoutPlanner />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/weekly-report" element={<WeeklyReport />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
