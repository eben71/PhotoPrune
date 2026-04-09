import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { GroupCard } from './GroupCard';

export function GroupList({
  groups,
  showHeader = true
}: {
  groups: Group[];
  showHeader?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <section className="surface-panel rounded-[1rem] px-8 py-10">
        <h2 className="text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
          {trustCopy.results.emptyHeader}
        </h2>
        <div className="mt-5 space-y-3 text-base leading-8 text-[var(--pp-on-surface-muted)]">
          {trustCopy.results.emptyDescription.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="review-queue">
      {showHeader ? (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#96a8cf]">
              Review Queue
            </p>
            <h2 className="mt-3 text-[2.1rem] font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
              Choose the best photo in each group.
            </h2>
          </div>
          <p className="max-w-[430px] text-sm leading-7 text-[var(--pp-on-surface-muted)]">
            Recommended keepers are suggestions only. Review each image before
            making any decision outside this app.
          </p>
        </div>
      ) : null}

      <div className="group-list-grid">
        {groups.map((group, index) => (
          <GroupCard key={group.groupId} group={group} index={index} />
        ))}
      </div>
    </section>
  );
}
