import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function AIInsightCard({ recommendations }) {
  const insightText = useMemo(() => {
    if (recommendations?.status_message) return recommendations.status_message;
    return 'Neural feed is syncing your nutrition, budget, and workout telemetry.';
  }, [recommendations]);

  const comboCount = recommendations?.meal_combos?.length || 0;
  const mealSuggestions = recommendations?.meal_suggestions?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="glass-card rounded-[var(--radius-bento)] p-6 border border-white/10 relative overflow-hidden"
    >
      <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[rgba(167,139,250,0.25)] blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Neural Feed</p>
            <h3 className="text-xl font-semibold text-white">AI Command Insight</h3>
          </div>
          <div className="ai-brain-pulse h-11 w-11 rounded-2xl flex items-center justify-center bg-[rgba(167,139,250,0.18)] border border-white/10 text-xl">
            🧠
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--text-soft)] mb-4">{insightText}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Combos</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--soft-lavender)]">{comboCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Suggestions</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--electric-emerald)]">{mealSuggestions}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
