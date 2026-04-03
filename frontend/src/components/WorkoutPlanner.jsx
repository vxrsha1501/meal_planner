import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWeeklyReport, getWorkoutPlan, logWorkout } from '../api';

export default function WorkoutPlanner() {
  const [workoutPreference, setWorkoutPreference] = useState('strength');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [subMuscle, setSubMuscle] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [fitnessStage, setFitnessStage] = useState('intermediate');
  const [notes, setNotes] = useState('');
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState('');
  const [startMsg, setStartMsg] = useState('');

  const queryClient = useQueryClient();

  const weeklyQuery = useQuery({
    queryKey: ['weekly-report'],
    queryFn: getWeeklyReport,
    refetchOnWindowFocus: false,
  });

  const generateMutation = useMutation({
    mutationFn: ({ preference, promptNotes }) => getWorkoutPlan(preference, promptNotes),
    onSuccess: (result) => {
      setPlan(normalizeWorkoutAnalysis(result.analysis || null));
      setPlanError('');
    },
    onError: (err) => {
      setPlanError(err.message || 'Unable to generate workout plan right now.');
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ activity, duration, description }) => logWorkout(activity, duration, description),
    onSuccess: () => {
      setStartMsg('Workout started and logged. Heatmap updated.');
      queryClient.invalidateQueries({ queryKey: ['weekly-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      setStartMsg(err.message || 'Could not start workout.');
    },
  });

  const subMuscleOptions = useMemo(() => {
    const mapping = {
      chest: ['upper chest', 'middle chest', 'lower chest', 'inner chest', 'outer chest'],
      back: ['lats', 'traps', 'rhomboids'],
      legs: ['quads', 'hamstrings', 'calves'],
      arms: ['biceps short head', 'biceps long head', 'triceps long head', 'triceps lateral head', 'triceps medial head'],
      shoulders: ['front delts', 'side delts', 'rear delts'],
      core: ['upper abs', 'lower abs', 'obliques', 'transverse abdominis'],
    };
    return mapping[muscleGroup] || [];
  }, [muscleGroup]);

  const handleGenerate = () => {
    const promptNotes = [
      notes,
      `muscle_group:${muscleGroup || 'general'}`,
      `sub_muscle:${subMuscle || 'none'}`,
      `training_type:${trainingType || 'general_fitness'}`,
      `intensity:${intensity}`,
      `fitness_stage:${fitnessStage}`,
    ].filter(Boolean).join(' | ');

    generateMutation.mutate({
      preference: workoutPreference,
      promptNotes,
    });
  };

  const handleStartWorkout = () => {
    if (!plan) return;

    const activity = plan.workout_plan.title || workoutPreference;
    const duration = plan.workout_plan.duration || '30 min';
    const description = plan.workout_plan.plan_steps.join(' | ') || plan.summary || 'AI generated workout';

    startMutation.mutate({ activity, duration, description });
  };

  const days = weeklyQuery.data?.days || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Workout Planner</p>
        <h1 className="text-3xl font-black text-white">Generate and Start Workout</h1>
        <p className="text-sm text-[var(--text-soft)] mt-1">Pick your selection, generate AI plan, then start workout to mark the heatmap.</p>
      </header>

      <section className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <select className="input-field" value={workoutPreference} onChange={(e) => setWorkoutPreference(e.target.value)}>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="hiit">HIIT</option>
            <option value="yoga">Yoga</option>
            <option value="mobility">Mobility</option>
          </select>

          <select className="input-field" value={muscleGroup} onChange={(e) => { setMuscleGroup(e.target.value); setSubMuscle(''); }}>
            <option value="">Muscle Group</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="legs">Legs</option>
            <option value="arms">Arms</option>
            <option value="shoulders">Shoulders</option>
            <option value="core">Core</option>
          </select>

          <select className="input-field" value={subMuscle} onChange={(e) => setSubMuscle(e.target.value)} disabled={!subMuscleOptions.length}>
            <option value="">Sub Muscle</option>
            {subMuscleOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select className="input-field" value={trainingType} onChange={(e) => setTrainingType(e.target.value)}>
            <option value="">Training Type</option>
            <option value="bodybuilding">Bodybuilding</option>
            <option value="powerlifting">Powerlifting</option>
            <option value="calisthenics">Calisthenics</option>
            <option value="crossfit">CrossFit</option>
            <option value="compound">Compound Lifting</option>
          </select>

          <select className="input-field" value={intensity} onChange={(e) => setIntensity(e.target.value)}>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="intense">Intense</option>
            <option value="extreme">Extreme</option>
          </select>

          <select className="input-field" value={fitnessStage} onChange={(e) => setFitnessStage(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <input
            className="input-field md:col-span-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes: home workout, no equipment, knee pain, etc."
          />
          <button className="btn-primary" type="button" onClick={handleGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>

        {planError && <p className="mt-3 text-sm text-rose-400">{planError}</p>}
      </section>

      {plan && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white">Workout Plan</h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">{plan.workout_plan.title}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Duration: {plan.workout_plan.duration}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Intensity: {plan.workout_plan.intensity}</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
              {plan.workout_plan.plan_steps.map((step, idx) => (
                <li key={idx}>• {step}</li>
              ))}
            </ul>
            <button className="btn-primary mt-4 w-full" type="button" onClick={handleStartWorkout} disabled={startMutation.isPending}>
              {startMutation.isPending ? 'Starting...' : 'Start Workout'}
            </button>
            {startMsg && <p className="mt-2 text-xs text-[var(--electric-emerald)]">{startMsg}</p>}
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white">Meal Suggestions</h2>
            <div className="mt-3 space-y-3">
              {plan.meal_suggestions.map((meal, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-sm font-semibold text-white">{meal.title} ({meal.meal})</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {meal.calories} cal • {meal.protein_g}g protein • ₹{meal.estimated_cost_inr}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white">Workout Videos</h2>
            <div className="mt-3 space-y-2 text-sm">
              {getWorkoutVideos(muscleGroup || workoutPreference).map((video) => (
                <a key={video.url} href={video.url} target="_blank" rel="noreferrer" className="block text-cyan-300 hover:text-cyan-200 underline">
                  {video.title}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Workout Heatmap</h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const intensityCell = Math.min(4, day.workouts.length + (day.calories > (weeklyQuery.data?.calorie_target || 0) ? 1 : 0));
            return (
              <div key={idx} className="text-center">
                <div className={`heatmap-cell intensity-${intensityCell}`} />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{day.day}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="text-center text-[11px] text-[var(--text-muted)] py-2">
        Valyrian Minds Production
      </footer>
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

  return {
    workout_plan: {
      title: workoutPlanSource.title || 'Custom Plan',
      duration: normalizedDuration,
      intensity: workoutPlanSource.intensity || 'N/A',
      plan_steps: normalizedPlanSteps,
    },
    meal_suggestions: mealSuggestions,
    summary: source.summary || '',
  };
}

function getWorkoutVideos(target) {
  const key = (target || '').toLowerCase();
  const videosByTarget = {
    chest: [
      { title: 'Chest Workout Form Guide', url: 'https://www.youtube.com/watch?v=bps0uIgf6dg' },
    ],
    back: [
      { title: 'Back Day Technique Guide', url: 'https://www.youtube.com/watch?v=w1eQ67dLsgA' },
    ],
    legs: [
      { title: 'Leg Workout Tutorial', url: 'https://www.youtube.com/watch?v=MzeiSTQtuyw' },
    ],
    arms: [
      { title: 'Arms Workout Tutorial', url: 'https://www.youtube.com/watch?v=o9zCgPtsups' },
    ],
    shoulders: [
      { title: 'Shoulder Workout Tutorial', url: 'https://www.youtube.com/watch?v=MzeiSTQtuyw' },
    ],
    core: [
      { title: 'Core and Abs Routine', url: 'https://www.youtube.com/watch?v=RarcD0Q50nU' },
    ],
    strength: [
      { title: 'Strength Fundamentals', url: 'https://www.youtube.com/watch?v=bps0uIgf6dg' },
    ],
    cardio: [
      { title: 'Cardio Session Guide', url: 'https://www.youtube.com/watch?v=RarcD0Q50nU' },
    ],
    hiit: [
      { title: 'HIIT Routine', url: 'https://www.youtube.com/watch?v=o9zCgPtsups' },
    ],
    yoga: [
      { title: 'Yoga Flow for Recovery', url: 'https://www.youtube.com/watch?v=RarcD0Q50nU' },
    ],
  };

  return videosByTarget[key] || [
    { title: 'General Full Body Workout Guide', url: 'https://www.youtube.com/watch?v=RarcD0Q50nU' },
  ];
}
