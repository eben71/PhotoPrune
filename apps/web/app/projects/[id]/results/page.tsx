'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { GroupList } from '../../../components/GroupList';
import type { Group } from '../../../../src/types/phase2Envelope';
import { ProjectScanResultsResponseSchema } from '../../../../src/types/projects';

type Review = {
  state: 'UNREVIEWED' | 'IN_PROGRESS' | 'DONE' | 'SNOOZED';
  keep_media_item_id?: string | null;
  notes?: string | null;
};

export default function ProjectResultsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState('');
  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const scanId = searchParams.get('scanId');

  useEffect(() => {
    if (!id || !scanId) return;
    void (async () => {
      const response = await fetch(
        `/api/projects/${id}/scans/${scanId}/results`
      );
      const payload = ProjectScanResultsResponseSchema.parse(
        await response.json()
      );
      setGroups(payload.envelope.results.groups);
      setReviews(payload.reviews);
    })();
  }, [id, scanId]);

  const markDone = async (groupId: string, keepMediaItemId: string) => {
    await fetch(`/api/projects/${id}/groups/${groupId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'DONE', keepMediaItemId })
    });
    setReviews((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        state: 'DONE',
        keep_media_item_id: keepMediaItemId
      }
    }));
  };

  const copyChecklist = async (group: Group) => {
    const keepId =
      reviews[group.groupId]?.keep_media_item_id ??
      group.representativeItemIds[0];
    const remove = group.items
      .map((item) => item.itemId)
      .filter((itemId) => itemId !== keepId);
    const text = `Keep: ${keepId}\nRemove candidates: ${remove.join(', ')}`;
    await navigator.clipboard.writeText(text);
  };

  const exportFile = async (format: 'json' | 'csv') => {
    const response = await fetch(`/api/projects/${id}/export?format=${format}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section>
      <h1>Project results</h1>
      <button type="button" onClick={() => void exportFile('csv')}>
        Export CSV
      </button>
      <button type="button" onClick={() => void exportFile('json')}>
        Export JSON
      </button>
      <GroupList groups={groups} />
      {groups.map((group) => {
        const keepId =
          reviews[group.groupId]?.keep_media_item_id ??
          group.representativeItemIds[0];
        const removeCandidates = group.items
          .map((item) => item.itemId)
          .filter((itemId) => itemId !== keepId);
        return (
          <section key={`${group.groupId}-checklist`}>
            <h2>Checklist for {group.groupId}</h2>
            <p>Done means you handled this manually in Google Photos.</p>
            <p>Keep: {keepId}</p>
            <p>Remove candidates: {removeCandidates.join(', ') || 'None'}</p>
            <button type="button" onClick={() => void copyChecklist(group)}>
              Copy checklist text
            </button>
            <button
              type="button"
              onClick={() => void markDone(group.groupId, keepId)}
            >
              Mark DONE
            </button>
            {group.items.map((item) => (
              <a
                key={item.itemId}
                href={
                  item.links.googlePhotos.url ??
                  item.links.googlePhotos.fallbackUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Open {item.itemId}
              </a>
            ))}
          </section>
        );
      })}
    </section>
  );
}
