import { useState, useEffect } from 'react';
import { getWeeklyReport } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

/**
 * WeeklyReport — Bar chart for last 7 days + workout summary.
 */
export default function WeeklyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const data = await getWeeklyReport();
      setReport(data);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-rose-400">Could not load weekly report</p>
      </div>
    );
  }

  const { days, calorie_target } = report;

  // Prepare chart data
  const chartData = days.map((d) => ({
    day: d.day,
    Calories: d.calories,
    Protein: d.protein,
    Cost: d.cost,
    Target: calorie_target,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 text-xs space-y-1 border border-white/10">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Cost' ? `₹${entry.value}` : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // Calculate weekly totals
  const totalCal = days.reduce((s, d) => s + d.calories, 0);
  const totalProtein = days.reduce((s, d) => s + d.protein, 0);
  const totalCost = days.reduce((s, d) => s + d.cost, 0);
  const totalWorkouts = days.reduce((s, d) => s + d.workouts.length, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold text-white">Weekly Report</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon="🔥" label="Total Calories" value={totalCal.toLocaleString()} gradient="from-amber-500 to-orange-500" />
        <SummaryCard icon="🥩" label="Total Protein" value={`${totalProtein}g`} gradient="from-emerald-500 to-teal-500" />
        <SummaryCard icon="💰" label="Total Spent" value={`₹${totalCost}`} gradient="from-violet-500 to-purple-500" />
        <SummaryCard icon="🏋️" label="Workouts" value={totalWorkouts} gradient="from-cyan-500 to-blue-500" />
      </div>

      {/* Calories Chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📊 Daily Calories (Last 7 Days)</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Calories" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Protein" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {calorie_target > 0 && (
          <p className="text-xs text-slate-500 mt-2 text-center">
            Daily target: {calorie_target} cal
          </p>
        )}
      </div>

      {/* Spending Chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">💰 Daily Spending (Last 7 Days)</h2>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workouts per Day */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">🏋️ Workouts Per Day</h2>
        <div className="space-y-3">
          {days.map((day, idx) => (
            <div key={idx} className="flex items-start gap-4 py-2.5 px-3 rounded-lg bg-white/[0.03]">
              <div className="w-12 text-center">
                <p className="text-sm font-bold text-white">{day.day}</p>
                <p className="text-[10px] text-slate-500">{day.date.slice(5)}</p>
              </div>
              <div className="flex-1">
                {day.workouts.length > 0 ? (
                  day.workouts.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-400 font-medium">{w.activity}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{w.duration}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 italic">No workout logged</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{day.calories} cal</p>
                <p className="text-xs text-slate-500">₹{day.cost}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, gradient }) {
  return (
    <div className="glass-card p-4 group hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
