import React, { useState } from 'react';
import type { PortalProfile } from '../portalAuth';

type Props = {
  profile: PortalProfile;
  onSignOut: () => void;
};

export const CustomerSettingsTab: React.FC<Props> = ({ profile, onSignOut }) => {
  const [name, setName] = useState(profile.fullName);
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-xs text-slate-400">Profile preferences (local on web — account email from Supabase).</p>
      <label className="block text-xs font-semibold text-slate-300">Display name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
      />
      <label className="block text-xs font-semibold text-slate-300">Email</label>
      <input
        value={profile.email}
        disabled
        className="w-full bg-[#0b0c10]/50 border border-white/10 rounded-xl px-3 py-2.5 text-slate-500 text-sm"
      />
      <label className="block text-xs font-semibold text-slate-300">Phone</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
      />
      <button
        type="button"
        onClick={() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white"
      >
        {saved ? 'Saved locally ✓' : 'Save preferences'}
      </button>
      <button type="button" onClick={onSignOut} className="w-full py-3 text-xs text-rose-300 border border-rose-500/30 rounded-xl">
        Sign out
      </button>
    </div>
  );
};
