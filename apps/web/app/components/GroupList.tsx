import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { GroupCard } from './GroupCard';

export function GroupList({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return (
      <section className="surface-panel rounded-[1.8rem] px-8 py-10">
        <h2 className="font-display text-3xl font-semibold text-white">
          {trustCopy.results.emptyHeader}
        </h2>
        <div className="mt-5 space-y-3 text-base leading-8 text-slate-400">
          {trustCopy.results.emptyDescription.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
            Review queue
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white">
            Choose the best photo in each group.
          </h2>
        </div>
        <p className="max-w-[420px] text-sm leading-7 text-slate-400">
          Recommended keepers are suggestions only. Review each image before
          making any decision outside this app.
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group, index) => (
          <GroupCard key={group.groupId} group={group} index={index} />
        ))}
      </div>
    </section>
  );
}
