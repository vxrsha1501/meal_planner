import { useState } from 'react';

/**
 * ProfileForm — Collects user health data and budget.
 * Calculates BMI and calorie target on the backend.
 *
 * Props:
 *   onSubmit(profileData) — called with { height_cm, weight_kg, age, goal, daily_budget }
 *   isLoading — disables form during submission
 */
export default function ProfileForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    height_cm: '',
    weight_kg: '',
    age: '',
    goal: 'maintain',
    daily_budget: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      height_cm: parseFloat(form.height_cm),
      weight_kg: parseFloat(form.weight_kg),
      age: parseInt(form.age),
      goal: form.goal,
      daily_budget: parseFloat(form.daily_budget),
    });
  };

  const isValid =
    form.height_cm && form.weight_kg && form.age && form.daily_budget;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-lg animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-4">
            <span className="text-3xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Lifestyle Planner
          </h1>
          <p className="text-sm text-slate-400">
            AI-powered budget-aware meal & workout recommendations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Height & Weight row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Height (cm)
              </label>
              <input
                type="number"
                name="height_cm"
                value={form.height_cm}
                onChange={handleChange}
                placeholder="170"
                className="input-field"
                min="100"
                max="250"
                required
                id="input-height"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight_kg"
                value={form.weight_kg}
                onChange={handleChange}
                placeholder="70"
                className="input-field"
                min="30"
                max="300"
                required
                id="input-weight"
              />
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder="25"
              className="input-field"
              min="10"
              max="120"
              required
              id="input-age"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Goal
            </label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              className="input-field"
              id="select-goal"
            >
              <option value="lose">🔥 Lose Weight</option>
              <option value="maintain">⚖️ Maintain Weight</option>
              <option value="gain">💪 Gain Weight</option>
            </select>
          </div>

          {/* Daily Budget */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Daily Food Budget (₹)
            </label>
            <input
              type="number"
              name="daily_budget"
              value={form.daily_budget}
              onChange={handleChange}
              placeholder="500"
              className="input-field"
              min="50"
              required
              id="input-budget"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="btn-primary w-full text-center mt-6"
            id="btn-setup"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Setting up...
              </span>
            ) : (
              'Get Started →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
