import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

/**
 * Signup — Full registration form with profile data.
 */
export default function Signup({ onSignup, isLoading, error }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      username: '',
      password: '',
      height_cm: '',
      weight_kg: '',
      age: '',
      goal: 'maintain',
      target_weight: '',
      default_budget: '',
    },
  });

  const goal = watch('goal');
  const showTargetWeight = goal === 'lose' || goal === 'gain';

  const onSubmit = (form) => {
    const data = {
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password,
      height_cm: parseFloat(form.height_cm),
      weight_kg: parseFloat(form.weight_kg),
      age: parseInt(form.age),
      goal: form.goal,
      default_budget: parseFloat(form.default_budget),
    };
    if (form.goal !== 'maintain' && form.target_weight) {
      data.target_weight = parseFloat(form.target_weight);
    }
    onSignup(data);
  };

  const budgetMin = useMemo(() => 50, []);

  return (
    <div className="auth-container">
      <div className="glass-card p-8 w-full max-w-lg animate-fade-in-up" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-3">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-1">
            Create Account
          </h1>
          <p className="text-sm text-slate-400">
            Set up your health profile to get started
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name & Username */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                className="input-field"
                {...register('name', { required: true })}
                id="input-signup-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                name="username"
                placeholder="johndoe"
                className="input-field"
                {...register('username', { required: true })}
                id="input-signup-username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Min 4 characters"
              className="input-field"
              {...register('password', { required: true, minLength: 4 })}
              id="input-signup-password"
            />
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Height (cm)
              </label>
              <input
                type="number"
                name="height_cm"
                placeholder="170"
                className="input-field"
                {...register('height_cm', { required: true, min: 100, max: 250 })}
                id="input-signup-height"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight_kg"
                placeholder="70"
                className="input-field"
                {...register('weight_kg', { required: true, min: 30, max: 300 })}
                id="input-signup-weight"
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
              placeholder="25"
              className="input-field"
              {...register('age', { required: true, min: 10, max: 120 })}
              id="input-signup-age"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Goal
            </label>
            <select
              name="goal"
              className="input-field"
              {...register('goal', { required: true })}
              id="select-signup-goal"
            >
              <option value="lose">🔥 Lose Weight</option>
              <option value="maintain">⚖️ Maintain Weight</option>
              <option value="gain">💪 Gain Weight</option>
            </select>
          </div>

          {/* Target Weight (conditional) */}
          {showTargetWeight && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Target Weight (kg)
              </label>
              <input
                type="number"
                name="target_weight"
                placeholder={goal === 'lose' ? '65' : '80'}
                className="input-field"
                {...register('target_weight', { min: 30, max: 300 })}
                id="input-signup-target-weight"
              />
            </div>
          )}

          {/* Default Budget */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Default Daily Budget (₹)
            </label>
            <input
              type="number"
              name="default_budget"
              placeholder="500"
              className="input-field"
              {...register('default_budget', { required: true, min: budgetMin })}
              id="input-signup-budget"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="btn-primary w-full text-center mt-4"
            id="btn-signup"
          >
            {isLoading ? 'Creating account...' : 'Get Started →'}
          </button>
        </form>

        {/* Link to login */}
        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
