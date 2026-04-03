import { useState, useEffect } from 'react';
import { getProfile, changePassword } from '../api';

/**
 * Profile — Show user info, goal, target weight, change password.
 */
export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

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

  const goalLabels = {
    lose: '🔥 Lose Weight',
    gain: '💪 Gain Weight',
    maintain: '⚖️ Maintain',
  };

  const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-400' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-400' };
    return { label: 'Obese', color: 'text-rose-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-rose-400">Could not load profile</p>
      </div>
    );
  }

  const bmiInfo = getBmiCategory(profile.bmi);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold text-white">Your Profile</h1>

      {/* Profile Info */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white">
            {profile.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <p className="text-sm text-slate-400">@{profile.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoItem label="Height" value={`${profile.height_cm} cm`} />
          <InfoItem label="Weight" value={`${profile.weight_kg} kg`} />
          <InfoItem label="Age" value={`${profile.age} years`} />
          <InfoItem
            label="BMI"
            value={
              <span>
                {profile.bmi}{' '}
                <span className={`text-xs ${bmiInfo.color}`}>({bmiInfo.label})</span>
              </span>
            }
          />
          <InfoItem label="Goal" value={goalLabels[profile.goal] || profile.goal} />
          <InfoItem label="Calorie Target" value={`${profile.calorie_target} cal/day`} />
          {profile.target_weight && (
            <InfoItem label="Target Weight" value={`${profile.target_weight} kg`} />
          )}
          <InfoItem label="Default Budget" value={`₹${profile.default_budget}/day`} />
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">🔒 Change Password</h2>

        {pwMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-300">
            {pwMsg}
          </div>
        )}
        {pwErr && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-sm text-rose-300">
            {pwErr}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              className="input-field"
              required
              id="input-current-password"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                value={pwForm.new}
                onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
                className="input-field"
                minLength={4}
                required
                id="input-new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="input-field"
                minLength={4}
                required
                id="input-confirm-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwLoading || !pwForm.current || !pwForm.new || !pwForm.confirm}
            className="btn-primary"
            id="btn-change-password"
          >
            {pwLoading ? 'Changing...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03]">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
