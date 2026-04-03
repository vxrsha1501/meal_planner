import { useState } from 'react';
import MealSection from './MealSection';
import { updateBudget, logWorkout } from '../api';

/**
 * Dashboard — Top cards, today's progress, meal sections,
 * suggested combos, workout plan, budget override.
 */
export default function Dashboard({ data, foodItems, onRefresh, onLogMeal, isLogging }) {
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetMsg, setBudgetMsg] = useState('');
  const [workoutLogging, setWorkoutLogging] = useState(false);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  const { user, progress, meals_by_type, recommendations, today_workout } = data;

  // Progress percentages
  const calPercent = Math.min(100, Math.round((progress.calories_consumed / progress.calorie_target) * 100));
  const budgetPercent = Math.min(100, Math.round((progress.budget_used / progress.budget_limit) * 100));

  const calColor = calPercent > 100 ? 'from-rose-500 to-red-600'
    : calPercent > 80 ? 'from-amber-400 to-orange-500'
    : 'from-emerald-400 to-cyan-500';

  const budgetColor = budgetPercent > 100 ? 'from-rose-500 to-red-600'
    : budgetPercent > 80 ? 'from-amber-400 to-orange-500'
    : 'from-violet-400 to-purple-500';

  const goalLabels = {
    lose: '🔥 Lose Weight',
    gain: '💪 Gain Weight',
    maintain: '⚖️ Maintain',
  };

  const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  // Budget override handler
  const handleBudgetUpdate = async () => {
    if (!budgetInput || parseFloat(budgetInput) <= 0) return;
    try {
      const result = await updateBudget(parseFloat(budgetInput));
      setBudgetMsg(result.message);
      setBudgetInput('');
      onRefresh();
      setTimeout(() => setBudgetMsg(''), 3000);
    } catch (err) {
      setBudgetMsg(err.message);
    }
  };

  // Workout log handler
  const handleLogWorkout = async () => {
    if (!recommendations?.workout_suggestion) return;
    setWorkoutLogging(true);
    try {
      const ws = recommendations.workout_suggestion;
      await logWorkout(ws.activity, ws.duration, ws.description);
      onRefresh();
    } catch (err) {
      console.error('Failed to log workout:', err);
    } finally {
      setWorkoutLogging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📊" label="BMI" value={user.bmi} sub={getBmiCategory(user.bmi)} gradient="from-cyan-500 to-blue-500" />
        <StatCard
          icon="🎯"
          label="Goal"
          value={goalLabels[user.goal] || user.goal}
          sub={user.target_weight ? `Target: ${user.target_weight}kg` : null}
          gradient="from-emerald-500 to-teal-500"
          isText
        />
        <StatCard icon="🔥" label="Cal Target" value={progress.calorie_target} sub="cal/day" gradient="from-amber-500 to-orange-500" />
        <StatCard icon="💰" label="Budget" value={`₹${progress.budget_limit}`} sub="today" gradient="from-violet-500 to-purple-500" isText />
      </div>

      {/* Today's Progress */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Today's Progress</h2>

        {/* Calories */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Calories</span>
            <span className="text-sm font-semibold">
              <span className="text-white">{progress.calories_consumed}</span>
              <span className="text-slate-500"> / {progress.calorie_target} cal</span>
            </span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill bg-gradient-to-r ${calColor}`} style={{ width: `${Math.min(calPercent, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-500">{calPercent}% consumed</span>
            <span className={`text-xs font-medium ${progress.calories_remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {progress.calories_remaining >= 0
                ? `${progress.calories_remaining} cal remaining`
                : `${Math.abs(progress.calories_remaining)} cal over`}
            </span>
          </div>
        </div>

        {/* Budget */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Budget</span>
            <span className="text-sm font-semibold">
              <span className="text-white">₹{progress.budget_used}</span>
              <span className="text-slate-500"> / ₹{progress.budget_limit}</span>
            </span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill bg-gradient-to-r ${budgetColor}`} style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-500">{budgetPercent}% spent</span>
            <span className={`text-xs font-medium ${progress.budget_remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {progress.budget_remaining >= 0
                ? `₹${progress.budget_remaining} remaining`
                : `₹${Math.abs(progress.budget_remaining)} over`}
            </span>
          </div>
        </div>

        {/* Protein */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03]">
          <span className="text-sm">🥩</span>
          <span className="text-sm text-slate-300">
            Protein consumed: <span className="font-semibold text-cyan-400">{progress.protein_consumed || 0}g</span>
          </span>
        </div>
      </div>

      {/* Budget Override */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">💰 Set Today's Budget</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder={`Default: ₹${user.default_budget}`}
            className="input-field text-sm py-2 flex-1"
            min="1"
            id="input-budget-override"
          />
          <button
            onClick={handleBudgetUpdate}
            disabled={!budgetInput}
            className="btn-primary text-sm py-2 px-4"
            id="btn-update-budget"
          >
            Update
          </button>
        </div>
        {budgetMsg && (
          <p className="text-xs text-emerald-400 mt-2">{budgetMsg}</p>
        )}
      </div>

      {/* Status Message */}
      {recommendations?.status_message && (
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm shrink-0 mt-0.5">
              🧠
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{recommendations.status_message}</p>
          </div>
        </div>
      )}

      {/* Meal Sections */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">🍽️ Log Your Meals</h2>
        <div className="space-y-4">
          {['breakfast', 'lunch', 'dinner'].map((type) => (
            <MealSection
              key={type}
              mealType={type}
              foodItems={foodItems}
              loggedMeals={meals_by_type?.[type] || []}
              onSaveMeal={onLogMeal}
              isLogging={isLogging}
              recommendations={recommendations}
            />
          ))}
        </div>
      </div>

      {/* Suggested Meal Combos */}
      {recommendations?.meal_combos?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🥗 Suggested Combinations</h2>
          <div className="space-y-3">
            {recommendations.meal_combos.map((combo, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {combo.items.join(' + ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400">{combo.total_calories} cal</span>
                  <span className="text-amber-400">₹{combo.total_cost}</span>
                  <span className="text-cyan-400">{combo.total_protein}g protein</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workout Plan */}
      {recommendations?.workout_suggestion && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">
              🏋️
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Workout Plan</h2>
              <p className="text-xs text-slate-400">Based on your goals and intake</p>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-violet-500/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-white">
                {recommendations.workout_suggestion.activity}
              </h3>
              <span className="text-sm font-semibold text-violet-400 bg-violet-500/15 px-3 py-1 rounded-full">
                ⏱ {recommendations.workout_suggestion.duration}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {recommendations.workout_suggestion.description}
            </p>
            {!today_workout && (
              <button
                onClick={handleLogWorkout}
                disabled={workoutLogging}
                className="btn-secondary text-xs"
                id="btn-log-workout"
              >
                {workoutLogging ? 'Logging...' : '✅ Mark as Done'}
              </button>
            )}
            {today_workout && (
              <p className="text-xs text-emerald-400 font-medium">✅ Workout completed today!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ icon, label, value, sub, gradient, isText }) {
  return (
    <div className="glass-card p-4 group hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-bold ${isText ? 'text-base' : 'text-2xl'} text-white`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
