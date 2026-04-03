/**
 * Dashboard — Displays calorie and budget progress with visual indicators.
 * Shows progress bars, BMI, goal, and meal history.
 *
 * Props:
 *   data — the full dashboard response from the backend
 *   onReset — callback to reset daily counters
 */
export default function Dashboard({ data, onReset }) {
  if (!data) return null;

  const { user, progress, meal_history } = data;

  // Calculate progress percentages
  const calPercent = Math.min(
    100,
    Math.round((progress.calories_consumed / progress.calorie_target) * 100)
  );
  const budgetPercent = Math.min(
    100,
    Math.round((progress.budget_used / progress.budget_limit) * 100)
  );

  // Color logic for progress bars
  const calColor =
    calPercent > 100
      ? 'from-rose-500 to-red-600'
      : calPercent > 80
      ? 'from-amber-400 to-orange-500'
      : 'from-emerald-400 to-cyan-500';

  const budgetColor =
    budgetPercent > 100
      ? 'from-rose-500 to-red-600'
      : budgetPercent > 80
      ? 'from-amber-400 to-orange-500'
      : 'from-violet-400 to-purple-500';

  // Goal label
  const goalLabels = {
    lose: '🔥 Lose Weight',
    gain: '💪 Gain Weight',
    maintain: '⚖️ Maintain',
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BMI */}
        <StatCard
          icon="📊"
          label="BMI"
          value={user.bmi}
          sub={getBmiCategory(user.bmi)}
          gradient="from-cyan-500 to-blue-500"
        />
        {/* Goal */}
        <StatCard
          icon="🎯"
          label="Goal"
          value={goalLabels[user.goal] || user.goal}
          gradient="from-emerald-500 to-teal-500"
          isText
        />
        {/* Calorie Target */}
        <StatCard
          icon="🔥"
          label="Cal Target"
          value={progress.calorie_target}
          sub="cal/day"
          gradient="from-amber-500 to-orange-500"
        />
        {/* Budget */}
        <StatCard
          icon="💰"
          label="Budget"
          value={`₹${progress.budget_limit}`}
          sub="per day"
          gradient="from-violet-500 to-purple-500"
          isText
        />
      </div>

      {/* Progress Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Today's Progress</h2>
          <button onClick={onReset} className="btn-secondary text-xs" id="btn-reset-day">
            🔄 New Day
          </button>
        </div>

        {/* Calories Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Calories</span>
            <span className="text-sm font-semibold">
              <span className="text-white">{progress.calories_consumed}</span>
              <span className="text-slate-500"> / {progress.calorie_target} cal</span>
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill bg-gradient-to-r ${calColor}`}
              style={{ width: `${Math.min(calPercent, 100)}%` }}
            />
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

        {/* Budget Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Budget</span>
            <span className="text-sm font-semibold">
              <span className="text-white">₹{progress.budget_used}</span>
              <span className="text-slate-500"> / ₹{progress.budget_limit}</span>
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill bg-gradient-to-r ${budgetColor}`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-500">{budgetPercent}% spent</span>
            <span className={`text-xs font-medium ${progress.budget_remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {progress.budget_remaining >= 0
                ? `₹${progress.budget_remaining} remaining`
                : `₹${Math.abs(progress.budget_remaining)} over budget`}
            </span>
          </div>
        </div>
      </div>

      {/* Meal History */}
      {meal_history && meal_history.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🍽️ Today's Meals</h2>
          <div className="space-y-2">
            {meal_history.map((meal, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 font-medium">
                    {meal.food_item}
                  </span>
                  {meal.quantity > 1 && (
                    <span className="text-xs text-slate-500">×{meal.quantity}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400">{meal.total_calories} cal</span>
                  <span className="text-amber-400">₹{meal.total_cost}</span>
                </div>
              </div>
            ))}
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
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-sm`}
        >
          {icon}
        </div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-bold ${isText ? 'text-base' : 'text-2xl'} text-white`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function getBmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}
