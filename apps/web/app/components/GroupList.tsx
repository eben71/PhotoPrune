import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { GroupCard } from './GroupCard';

export function GroupList({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return (
      <section className="card">
        <h2>{trustCopy.results.emptyHeader}</h2>
        {trustCopy.results.emptyDescription.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    );
  }

  return (
    <section className="group-list">
      <h2>We found groups of very similar photos for you to review.</h2>
      {groups.map((group, index) => (
        <GroupCard key={group.groupId} group={group} index={index} />
      ))}
    </section>
  );
}
