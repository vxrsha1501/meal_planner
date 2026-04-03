import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getWeeklyReport } from '../api';

export default function WeeklyReport() {
  const { data: report, isLoading: loading } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: getWeeklyReport,
  });

  if (loading) {
    return (
      <div className="bento-skeleton-grid">
        <div className="bento-skeleton tile-span-12" />
        <div className="bento-skeleton tile-span-6" />
        <div className="bento-skeleton tile-span-6" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-card rounded-[var(--radius-bento)] p-6">
        <p className="text-rose-400">Could not load weekly report.</p>
      </div>
    );
  }

  const { days, calorie_target } = report;
  const chartData = days.map((d) => ({
    day: d.day,
    calories: d.calories,
    budget: d.cost,
    protein: d.protein,
    workouts: d.workouts.length,
  }));

  const totalCal = days.reduce((s, d) => s + d.calories, 0);
  const totalProtein = days.reduce((s, d) => s + d.protein, 0);
  const totalCost = days.reduce((s, d) => s + d.cost, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Analytics Suite</p>
        <h1 className="text-3xl font-black text-white">Weekly Performance Graph</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Calories" value={totalCal.toLocaleString()} tone="emerald" />
        <SummaryCard label="Protein" value={`${totalProtein}g`} tone="lavender" />
        <SummaryCard label="Spend" value={`₹${totalCost}`} tone="amber" />
        <SummaryCard label="Daily Target" value={`${calorie_target} cal`} tone="emerald" />
      </div>

      <div className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Gradient Area Splines: Calories vs Budget</h2>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="day" stroke="rgba(148,163,184,0.9)" />
              <YAxis stroke="rgba(148,163,184,0.9)" />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
              <Legend />
              <Area type="monotone" dataKey="calories" stroke="#10B981" fill="url(#calGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="budget" stroke="#F59E0B" fill="url(#budgetGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Workout Intensity Heatmap</h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const intensity = Math.min(4, day.workouts.length + (day.calories > calorie_target ? 1 : 0));
            return (
              <div key={idx} className="text-center">
                <div className={`heatmap-cell intensity-${intensity}`} />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{day.day}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const color = tone === 'amber' ? 'text-[var(--vivid-amber)]' : tone === 'lavender' ? 'text-[var(--soft-lavender)]' : 'text-[var(--electric-emerald)]';
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
