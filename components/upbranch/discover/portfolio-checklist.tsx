'use client';
import { useEffect, useState } from 'react';
import { readLocalProgress, resetLocalProgress } from '@/lib/upbranch/progress';

const items = ['Problem statement and who it helps', 'Sources and permissions checked', 'Artifact or dated notebook', 'How AI was used and what you did', 'Human verification and test results', 'Reflection, limitations and next steps'];
const key = 'upbranch:portfolio-checklist:v1';

export function PortfolioChecklist() {
  const [checked, setChecked] = useState<string[]>([]);
  const [complete, setComplete] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(value)) setChecked(value.filter((x) => typeof x === 'string' && items.includes(x)));
    } catch {}
    setComplete(readLocalProgress().completedMissionIds);
    setReady(true);
  }, []);
  function toggle(item: string) {
    const next = checked.includes(item) ? checked.filter((x) => x !== item) : [...checked, item];
    setChecked(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }
  function reset() {
    try { localStorage.removeItem(key); } catch {}
    resetLocalProgress();
    setChecked([]);
    setComplete([]);
  }
  function download() {
    const blob = new Blob([JSON.stringify({ completedMissionIds: complete, evidenceChecklist: checked }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upbranch-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="mt-8 rounded-3xl border border-[#20251f]/20 bg-white p-7">
      <h2 className="text-2xl font-bold">Evidence checklist</h2>
      <div className="mt-5 space-y-3">
        {items.map((item) => <label key={item} className="flex gap-3"><input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} disabled={!ready} />{item}</label>)}
      </div>
      <p className="mt-7">Completed missions on this device: {ready ? complete.length : '…'}</p>
      <button onClick={download} className="mt-6 rounded-full bg-[#20251f] px-5 py-3 text-white">Export progress</button>
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-semibold">Data options</summary>
        <p className="mt-3">Reset removes saved mission progress and this checklist from this browser.</p>
        <button onClick={reset} className="mt-3 rounded-full border border-[#20251f] px-5 py-3">Reset local progress and checklist</button>
      </details>
    </div>
  );
}
