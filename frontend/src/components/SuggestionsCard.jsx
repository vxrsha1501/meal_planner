/**
 * SuggestionsCard — Displays AI-generated meal and workout recommendations.
 * Shows the decision engine's output in a visually appealing format.
 *
 * Props:
 *   recommendations — { meal_suggestions, workout_suggestion, status_message }
 */
export default function SuggestionsCard({ recommendations }) {
  if (!recommendations) return null;

  const { meal_suggestions, workout_suggestion, status_message } = recommendations;

  // Category badge colors
  const categoryColors = {
    protein: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    carbs: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    fruit: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    vegetable: 'bg-green-500/20 text-green-400 border-green-500/30',
    dairy: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    fat: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Status Message */}
      {status_message && (
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm shrink-0 mt-0.5">
              🧠
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{status_message}</p>
          </div>
        </div>
      )}

      {/* Meal Suggestions */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg">
            🥗
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Suggested Meals</h2>
            <p className="text-xs text-slate-400">Based on your goals and budget</p>
          </div>
        </div>

        {meal_suggestions && meal_suggestions.length > 0 ? (
          <div className="space-y-3 stagger">
            {meal_suggestions.map((meal, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/5 p-4 hover:border-emerald-500/30 transition-all duration-300 animate-fade-in-up opacity-0"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-white">
                      {meal.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        categoryColors[meal.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {meal.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="text-emerald-400 font-semibold">
                      {meal.calories} cal
                    </span>
                    <span className="text-amber-400 font-semibold">₹{meal.cost}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{meal.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">
            No meal suggestions available. Try logging a meal first!
          </p>
        )}
      </div>

      {/* Workout Suggestion */}
      {workout_suggestion && (
        <div className="glass-card p-6 animate-pulse-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">
              🏋️
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Workout Plan</h2>
              <p className="text-xs text-slate-400">Personalized for you</p>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-violet-500/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-white">
                {workout_suggestion.activity}
              </h3>
              <span className="text-sm font-semibold text-violet-400 bg-violet-500/15 px-3 py-1 rounded-full">
                ⏱ {workout_suggestion.duration}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {workout_suggestion.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
