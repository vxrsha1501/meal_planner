import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import MealSection from './MealSection';
import AIInsightCard from './AIInsightCard';
import FloatingCommandBar from './FloatingCommandBar';
import useUIStore from '../store/uiStore';
import { updateBudget, logWorkout, getWorkoutPlan } from '../api';

const MotionSection = motion.section;
const MotionArticle = motion.article;

export default function Dashboard({ data, foodItems, onRefresh, onLogMeal, isLogging }) {
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetMsg, setBudgetMsg] = useState('');
  const [workoutLogging, setWorkoutLogging] = useState(false);
  const [workoutPreference, setWorkoutPreference] = useState('strength');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [aiWorkoutLoading, setAiWorkoutLoading] = useState(false);
  const [aiWorkoutError, setAiWorkoutError] = useState('');
  const [aiWorkoutPlan, setAiWorkoutPlan] = useState(null);
  const viewMode = useUIStore((state) => state.viewMode);
  const toggleViewMode = useUIStore((state) => state.toggleViewMode);

  const safeData = data || {
    user: {},
    progress: {},
    meals_by_type: {},
    recommendations: {},
    today_workout: null,
  };

  const { user, progress, meals_by_type, recommendations, today_workout } = safeData;

  const calorieTarget = Math.max(progress.calorie_target || 1, 1);
  const budgetLimit = Math.max(progress.budget_limit || 1, 1);
  const calPercent = Math.min(100, Math.round(((progress.calories_consumed || 0) / calorieTarget) * 100));
  const budgetPercent = Math.min(100, Math.round(((progress.budget_used || 0) / budgetLimit) * 100));
  const proteinScore = Math.min(100, Math.round((((progress.protein_consumed || 0) / 120) * 100)));

  const efficiencyScore = useMemo(() => {
    const calorieEfficiency = 100 - Math.min(100, Math.abs(100 - calPercent));
    const budgetEfficiency = 100 - Math.min(100, Math.abs(100 - budgetPercent));
    return Math.round((calorieEfficiency * 0.55) + (budgetEfficiency * 0.45));
  }, [calPercent, budgetPercent]);

  if (!data) {
    return (
      <div className="bento-skeleton-grid">
        <div className="bento-skeleton tile-span-8" />
        <div className="bento-skeleton tile-span-4" />
        <div className="bento-skeleton tile-span-12" />
      </div>
    );
  }

  const goalTone = efficiencyScore >= 75
    ? 'text-[var(--electric-emerald)]'
    : efficiencyScore >= 55
      ? 'text-[var(--vivid-amber)]'
      : 'text-rose-400';

  const aiRecipes = Array.isArray(recommendations?.ai_recommended_recipes)
    ? recommendations.ai_recommended_recipes
    : [];
  const fallbackRecipes = Array.isArray(recommendations?.recommended_recipes)
    ? recommendations.recommended_recipes
    : [];
  const primaryRecipes = aiRecipes.length > 0 ? aiRecipes : fallbackRecipes;
  const aiRecipeStatus = recommendations?.ai_recipe_status || 'unknown';
  const aiRecipeMessage = recommendations?.ai_recipe_message || '';

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

  const handleGenerateWorkoutPlan = async () => {
    setAiWorkoutLoading(true);
    setAiWorkoutError('');
    try {
      const result = await getWorkoutPlan(workoutPreference, workoutNotes);
      setAiWorkoutPlan(normalizeWorkoutAnalysis(result.analysis || null));
    } catch (err) {
      setAiWorkoutError(err.message || 'Unable to generate workout plan right now.');
    } finally {
      setAiWorkoutLoading(false);
    }
  };

  const jumpToMeal = (mealType) => {
    const node = document.getElementById(`meal-section-${mealType}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="animate-fade-in-up">
      <FloatingCommandBar onJumpToMeal={jumpToMeal} />

      <div className={`grid grid-cols-12 gap-5 ${viewMode === 'expanded' ? 'xl:gap-6' : ''}`}>
        <MotionSection
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="col-span-12 lg:col-span-8 glass-card rounded-[var(--radius-bento)] border border-white/10 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Biometric Status</p>
              <h1 className="text-3xl font-black leading-tight text-white">Daily Efficiency Engine</h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                Balance calorie intent, budget pressure, and macro quality in one glance.
              </p>
            </div>
            <button type="button" onClick={toggleViewMode} className="btn-secondary text-xs" id="btn-toggle-view">
              {viewMode === 'focused' ? 'Expanded View' : 'Focused View'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <ConcentricRing value={calPercent} label="Calories" detail={`${progress.calories_consumed} / ${calorieTarget}`} tone="emerald" />
            <ConcentricRing value={budgetPercent} label="Budget" detail={`₹${progress.budget_used} / ₹${budgetLimit}`} tone="amber" />
            <ConcentricRing value={proteinScore} label="Protein" detail={`${progress.protein_consumed || 0}g / 120g`} tone="lavender" />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-soft)]">Summary Bento Tile</p>
              <p className={`text-4xl font-black ${goalTone}`}>{efficiencyScore}</p>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Efficiency score combines calorie adherence and budget adherence with weighted scoring.
            </p>
          </div>
        </MotionSection>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          <AIInsightCard recommendations={recommendations} />

          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.03 }}
            className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-5"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Budget Override</p>
            <h3 className="text-lg font-semibold text-white mt-1">Adjust Daily Spend Cap</h3>
            <div className="mt-3 flex flex-col gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder={`Default: ₹${user.default_budget}`}
                className="input-field"
                min="1"
                id="input-budget-override"
              />
              <button onClick={handleBudgetUpdate} disabled={!budgetInput} className="btn-primary" id="btn-update-budget">
                Update Budget
              </button>
              {budgetMsg && <p className="text-xs text-[var(--electric-emerald)]">{budgetMsg}</p>}
            </div>
          </MotionSection>
        </div>

        <MotionSection
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.06 }}
          className="col-span-12 glass-card rounded-[var(--radius-bento)] border border-white/10 p-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">AI Recipe Deck</p>
              <h2 className="text-2xl font-bold text-white">Recommended Recipes + Meal Combos</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="scan-meal-btn" type="button" id="btn-dashboard-scan">Scan Meal</button>
              <button
                className="btn-secondary text-xs"
                type="button"
                id="btn-refresh-ai-recipes"
                onClick={onRefresh}
              >
                Refresh AI Recipes
              </button>
            </div>
          </div>

          {aiRecipes.length === 0 && aiRecipeStatus !== 'ok' && (
            <p className="mt-3 text-xs text-amber-300">
              {aiRecipeMessage || 'AI recipes unavailable right now. Showing fallback recipe guidance.'}
            </p>
          )}

          {primaryRecipes.length ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {primaryRecipes.map((recipe, idx) => (
                <DefaultRecipeCard key={`recipe-${idx}`} recipe={recipe} source={aiRecipes.length > 0 ? 'AI' : 'Rule'} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-soft)]">No default recipe recommendations available for current scenario.</p>
          )}

          {recommendations?.meal_combos?.length ? (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] mb-2">Meal Combos</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recommendations.meal_combos.map((combo, idx) => (
                  <RecipeCard key={`combo-${idx}`} combo={combo} />
                ))}
              </div>
            </div>
          ) : null}
        </MotionSection>

        <MotionSection
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 }}
          className="col-span-12 lg:col-span-4 glass-card rounded-[var(--radius-bento)] border border-white/10 p-5"
        >
          <h3 className="text-lg font-semibold text-white">Workout Pulse</h3>
          {recommendations?.workout_suggestion ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-[var(--text-soft)]">{recommendations.workout_suggestion.activity}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{recommendations.workout_suggestion.duration}</p>
              <p className="text-sm text-white mt-3">{recommendations.workout_suggestion.description}</p>
              {!today_workout ? (
                <button onClick={handleLogWorkout} disabled={workoutLogging} className="btn-secondary mt-4" id="btn-log-workout">
                  {workoutLogging ? 'Logging...' : 'Mark Completed'}
                </button>
              ) : (
                <p className="mt-4 text-xs text-[var(--electric-emerald)]">Workout already completed today.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-soft)] mt-3">No workout recommendation available.</p>
          )}
        </MotionSection>

        <MotionSection
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.12 }}
          className="col-span-12 glass-card rounded-[var(--radius-bento)] border border-white/10 p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Workout Planner</p>
              <h2 className="text-2xl font-bold text-white">Pick Workout, Get Plan + Meals + Recipes</h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Tell AI what workout you want and it will generate the workout flow plus matching meals.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={workoutPreference}
              onChange={(e) => setWorkoutPreference(e.target.value)}
              className="input-field"
              id="select-workout-preference"
            >
              <option value="strength">Strength Training</option>
              <option value="cardio">Cardio</option>
              <option value="yoga">Yoga</option>
              <option value="hiit">HIIT</option>
              <option value="mobility">Mobility & Recovery</option>
            </select>
            <input
              type="text"
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              placeholder="Optional notes: beginner, knee pain, home only"
              className="input-field md:col-span-2"
              id="input-workout-notes"
            />
            <button
              type="button"
              onClick={handleGenerateWorkoutPlan}
              disabled={aiWorkoutLoading}
              className="btn-primary"
              id="btn-generate-workout-plan"
            >
              {aiWorkoutLoading ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>

          {aiWorkoutError && <p className="mt-3 text-sm text-rose-400">{aiWorkoutError}</p>}

          {aiWorkoutPlan && (
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-lg font-semibold text-white">Workout Plan</h3>
                <p className="text-sm text-[var(--text-soft)] mt-2">{aiWorkoutPlan.workout_plan?.title || 'Custom Plan'}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Duration: {aiWorkoutPlan.workout_plan?.duration || 'N/A'}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Intensity: {aiWorkoutPlan.workout_plan?.intensity || 'N/A'}</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
                  {aiWorkoutPlan.workout_plan.plan_steps.map((step, idx) => (
                    <li key={idx}>• {step}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-lg font-semibold text-white">Meal Suggestions</h3>
                <div className="mt-3 space-y-3">
                  {aiWorkoutPlan.meal_suggestions.map((meal, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-sm font-semibold text-white">{meal.title} ({meal.meal})</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {meal.calories} cal • {meal.protein_g}g protein • ₹{meal.estimated_cost_inr}
                      </p>
                      <p className="text-xs text-[var(--soft-lavender)] mt-1">{meal.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-lg font-semibold text-white">Recipes</h3>
                <div className="mt-3 space-y-3">
                  {aiWorkoutPlan.recipes.map((recipe, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-sm font-semibold text-white">{recipe.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Prep: {recipe.prep_time_min || 'N/A'} min</p>
                      <p className="text-xs text-[var(--text-soft)] mt-2">Ingredients: {recipe.ingredients.join(', ')}</p>
                      <ol className="mt-2 space-y-1 text-xs text-[var(--text-soft)]">
                        {recipe.steps.map((step, stepIdx) => (
                          <li key={stepIdx}>{stepIdx + 1}. {typeof step === 'string' ? step : step.instruction}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </MotionSection>

        <section className="col-span-12 lg:col-span-8 space-y-4">
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
        </section>
      </div>
    </div>
  );
}

function normalizeStringArray(value) {
  const objectToText = (item) => {
    if (!item || typeof item !== 'object') return '';

    const preferredKeys = ['instruction', 'description', 'text', 'title', 'name', 'action'];
    for (const key of preferredKeys) {
      if (typeof item[key] === 'string' && item[key].trim()) {
        const stepPrefix = typeof item.step === 'number' ? `Step ${item.step}: ` : '';
        return `${stepPrefix}${item[key].trim()}`;
      }
    }

    const parts = Object.values(item)
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .map((v) => String(v).trim())
      .filter(Boolean);

    if (parts.length) return parts.join(' - ');
    return JSON.stringify(item);
  };

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'number') return String(item);
      if (item && typeof item === 'object') return objectToText(item);
      return '';
    }).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function normalizeWorkoutAnalysis(analysis) {
  const source = (analysis && typeof analysis === 'object') ? analysis : {};
  const workoutPlanSource = (source.workout_plan && typeof source.workout_plan === 'object') ? source.workout_plan : {};

  const normalizedDuration = (() => {
    if (typeof workoutPlanSource.duration === 'string' && workoutPlanSource.duration.trim()) {
      return workoutPlanSource.duration;
    }
    const durationMin = Number(workoutPlanSource.duration_min);
    if (Number.isFinite(durationMin) && durationMin > 0) {
      return `${durationMin} min`;
    }
    return 'N/A';
  })();

  const exerciseSteps = Array.isArray(workoutPlanSource.exercises)
    ? workoutPlanSource.exercises
      .map((exercise) => {
        if (!exercise || typeof exercise !== 'object') return '';
        const name = typeof exercise.name === 'string' ? exercise.name : 'Exercise';
        const sets = Number(exercise.sets);
        const repsMin = Number(exercise.reps_min);
        const repsMax = Number(exercise.reps_max);
        const restSeconds = Number(exercise.rest_seconds);
        const repSegment = Number.isFinite(repsMin) && Number.isFinite(repsMax)
          ? `${repsMin}-${repsMax}`
          : '8-12';
        const setSegment = Number.isFinite(sets) ? `${sets}` : '3';
        const restSegment = Number.isFinite(restSeconds) ? `${restSeconds}s rest` : '';
        return `${name}: ${setSegment} sets x ${repSegment} reps${restSegment ? ` (${restSegment})` : ''}`;
      })
      .filter(Boolean)
    : [];

  const workoutPlanSteps = normalizeStringArray(workoutPlanSource.plan_steps);
  const normalizedPlanSteps = workoutPlanSteps.length
    ? workoutPlanSteps
    : [
      ...normalizeStringArray(workoutPlanSource.warmup_steps),
      ...exerciseSteps,
      ...normalizeStringArray(workoutPlanSource.cooldown_steps),
    ].filter(Boolean);

  const mealSuggestions = Array.isArray(source.meal_suggestions)
    ? source.meal_suggestions.map((meal) => ({
      title: meal?.title || 'Suggested meal',
      meal: meal?.meal || 'meal',
      calories: Number(meal?.calories || 0),
      protein_g: Number(meal?.protein_g || 0),
      estimated_cost_inr: Number(meal?.estimated_cost_inr || 0),
      reason: meal?.reason || '',
    }))
    : [];

  const recipes = Array.isArray(source.recipes)
    ? source.recipes.map((recipe) => ({
      name: recipe?.name || 'Recipe',
      prep_time_min: recipe?.prep_time_min,
      ingredients: normalizeStringArray(recipe?.ingredients),
      steps: normalizeStringArray(recipe?.steps),
    }))
    : [];

  return {
    workout_plan: {
      title: workoutPlanSource.title || 'Custom Plan',
      duration: normalizedDuration,
      intensity: workoutPlanSource.intensity || 'N/A',
      plan_steps: normalizedPlanSteps,
    },
    meal_suggestions: mealSuggestions,
    recipes,
    summary: source.summary || '',
  };
}

function ConcentricRing({ value, label, detail, tone }) {
  const trackColor = tone === 'amber' ? '#F59E0B' : tone === 'lavender' ? '#A78BFA' : '#10B981';

  return (
    <div className="ring-tile">
      <div
        className="concentric-ring"
        style={{
          background: `conic-gradient(${trackColor} ${Math.max(0, Math.min(100, value))}%, rgba(255,255,255,0.08) 0)`,
        }}
      >
        <div className="concentric-ring-inner">
          <p className="text-3xl font-extrabold text-white">{value}%</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function RecipeCard({ combo }) {
  return (
    <MotionArticle
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="h-28 rounded-xl recipe-image-placeholder" />
      <p className="mt-3 text-sm font-semibold text-white">{combo.items.join(' + ')}</p>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="text-[var(--electric-emerald)]">{combo.total_calories} cal</span>
        <span className="text-[var(--vivid-amber)]">₹{combo.total_cost}</span>
        <span className="text-[var(--soft-lavender)]">{combo.total_protein}g</span>
      </div>
    </MotionArticle>
  );
}

function DefaultRecipeCard({ recipe, source }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="h-20 rounded-xl recipe-image-placeholder" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{recipe.name}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-[var(--soft-lavender)]">{source}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Prep: {recipe.prep_time_min || 'N/A'} min</p>
      <p className="mt-2 text-xs text-[var(--text-soft)]">Ingredients: {(recipe.ingredients || []).join(', ')}</p>
      <ol className="mt-2 space-y-1 text-xs text-[var(--text-soft)]">
        {(recipe.steps || []).slice(0, 3).map((step, idx) => (
          <li key={idx}>{idx + 1}. {step}</li>
        ))}
      </ol>
      {recipe.reason && <p className="mt-2 text-xs text-[var(--soft-lavender)]">{recipe.reason}</p>}
    </div>
  );
}
