import type { Group } from '../../src/types/phase2Envelope';
import { GroupCard } from './GroupCard';

type GroupListProps = {
  groups: Group[];
};

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return <p>No duplicate groups found in your selection.</p>;
  }

  return (
    <section>
      <h2>Groups</h2>
      <div>
        {groups.map((group) => (
          <GroupCard key={group.groupId} group={group} />
        ))}
      </div>
    </section>
  );
}
