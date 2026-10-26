'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bounties } from '@/lib/upbranch/bounties/catalog';
import { listPublishedMissions } from '@/lib/upbranch/catalog';
import { readLocalProgress } from '@/lib/upbranch/progress';
import { rankBounties } from '@/lib/upbranch/pathways/match';

export function BountyBoard() {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [scope, setScope] = useState('all');
  const [interest, setInterest] = useState('');
  const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => { setCompleted(readLocalProgress().completedMissionIds); }, []);
  const ranked = rankBounties({ interests: interest ? [interest] : [], completedMissionIds: completed, targetSkills: [] }, bounties, listPublishedMissions());
  const filtered = ranked.filter(({ bounty: b }) => (difficulty === 'all' || b.difficulty === difficulty) && (scope === 'all' || b.estimatedScope === scope) && [b.title, b.problem, ...b.domains, ...b.prerequisiteSkillIds].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <>
      <div className="mt-8 rounded-3xl border border-[#20251f]/20 bg-white p-6">
        <label className="block text-sm font-bold">Search topics or skills
          <input className="mt-2 w-full rounded-xl border p-3 font-normal" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. research" />
        </label>
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">Filters</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-bold">Difficulty<select className="mt-2 w-full rounded-xl border p-3 font-normal" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="all">All levels</option><option>beginner</option><option>intermediate</option><option>advanced</option></select></label>
            <label className="text-sm font-bold">Scope<select className="mt-2 w-full rounded-xl border p-3 font-normal" value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">Any scope</option><option>weekend</option><option>multiweek</option><option>semester</option></select></label>
            <label className="text-sm font-bold">Interest<select className="mt-2 w-full rounded-xl border p-3 font-normal" value={interest} onChange={(e) => setInterest(e.target.value)}><option value="">Explore all</option>{['research', 'education', 'environment', 'software', 'security', 'accessibility', 'energy'].map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
        </details>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">How suggestions work</summary>
          <p className="mt-2">Suggestions use hand-tuned weights: interest 35%, readiness 30%, target skills 20%, feasibility 15%. They are a starting point, not a measure of your ability.</p>
        </details>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(({ bounty: b, why }) => (
          <article key={b.id} className="flex flex-col rounded-3xl border border-[#20251f]/20 bg-white p-6">
            <h2 className="text-xl font-bold">{b.title}</h2>
            <p className="mt-2 text-sm">{b.difficulty} · {b.estimatedScope}</p>
            <p className="mt-3 flex-1">{b.problem}</p>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold">Match details</summary>
              <p className="mt-2">{why.join(' · ')}.</p>
              <p className="mt-2">Practice: {b.prerequisiteSkillIds.map((s) => s.replaceAll('-', ' ')).join(', ')}</p>
            </details>
            <Link href={`/discover/${b.id}`} className="mt-6 font-bold underline underline-offset-4">View project brief →</Link>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <p className="mt-8 rounded-2xl bg-white p-6">No projects match those filters. Try another topic or reset the filters.</p>}
    </>
  );
}
