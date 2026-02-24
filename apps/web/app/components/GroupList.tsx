import type { Group } from '../../src/types/phase2Envelope';
import { trustCopy } from '../copy/trustCopy';
import { GroupCard } from './GroupCard';

type GroupListProps = {
  groups: Group[];
};

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <section>
        <h2>{trustCopy.results.emptyHeader}</h2>
        {trustCopy.results.emptyDescription.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    );
  }

  return (
    <section>
      <h2>Groups</h2>
      <div>
        {groups.map((group, index) => (
          <GroupCard key={group.groupId} group={group} index={index} />
        ))}
      </div>
    </section>
  );
}
