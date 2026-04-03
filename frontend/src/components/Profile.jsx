import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getProfile, changePassword } from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const chartData = useMemo(() => {
    if (!profile) return [];
    const now = Number(profile.weight_kg);
    const target = Number(profile.target_weight || profile.weight_kg);
    return [
      { month: 'W-3', value: now + 1.6 },
      { month: 'W-2', value: now + 1.1 },
      { month: 'W-1', value: now + 0.6 },
      { month: 'Now', value: now },
      { month: 'Target', value: target },
    ];
  }, [profile]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);

    if (pwForm.new !== pwForm.confirm) {
      setPwErr('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      const result = await changePassword(pwForm.current, pwForm.new);
      setPwMsg(result.message);
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bento-skeleton-grid">
        <div className="bento-skeleton tile-span-12" />
        <div className="bento-skeleton tile-span-12" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass-card rounded-[var(--radius-bento)] p-6">
        <p className="text-rose-400">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Biometric Identity</p>
        <h1 className="text-3xl font-black text-white">Health Passport</h1>
      </header>

      <section className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis dataKey="month" hide />
              <YAxis hide domain={[Math.min(...chartData.map((d) => d.value)) - 2, Math.max(...chartData.map((d) => d.value)) + 2]} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#A78BFA" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--electric-emerald)] to-cyan-400 flex items-center justify-center text-2xl font-black text-slate-900">
              {profile.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
              <p className="text-sm text-[var(--text-soft)]">@{profile.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Badge label="BMI" value={profile.bmi} tone="lavender" />
            <Badge label="Goal" value={profile.goal} tone="emerald" />
            <Badge label="Weight" value={`${profile.weight_kg} kg`} tone="amber" />
            <Badge label="Target" value={`${profile.target_weight || profile.weight_kg} kg`} tone="lavender" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-[var(--text-soft)]">
            <Info label="Height" value={`${profile.height_cm} cm`} />
            <Info label="Age" value={`${profile.age} years`} />
            <Info label="Calorie Target" value={`${profile.calorie_target} cal`} />
            <Info label="Daily Budget" value={`₹${profile.default_budget}`} />
          </div>
        </div>
      </section>

      <section className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-white">Security Settings</h2>

        {pwMsg && <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">{pwMsg}</div>}
        {pwErr && <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-300">{pwErr}</div>}

        <form onSubmit={handlePasswordChange} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            className="input-field"
            placeholder="Current password"
            required
            id="input-current-password"
          />
          <input
            type="password"
            value={pwForm.new}
            onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
            className="input-field"
            placeholder="New password"
            minLength={4}
            required
            id="input-new-password"
          />
          <input
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            className="input-field md:col-span-2"
            placeholder="Confirm new password"
            minLength={4}
            required
            id="input-confirm-password"
          />
          <button
            type="submit"
            disabled={pwLoading || !pwForm.current || !pwForm.new || !pwForm.confirm}
            className="btn-primary md:col-span-2"
            id="btn-change-password"
          >
            {pwLoading ? 'Changing password...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}

function Badge({ label, value, tone }) {
  const palette = tone === 'amber'
    ? 'from-amber-500/25 to-amber-200/5 text-[var(--vivid-amber)]'
    : tone === 'lavender'
      ? 'from-violet-500/25 to-violet-200/5 text-[var(--soft-lavender)]'
      : 'from-emerald-500/25 to-emerald-200/5 text-[var(--electric-emerald)]';

  return (
    <div className={`rounded-xl border border-white/10 bg-gradient-to-br ${palette} p-3`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
