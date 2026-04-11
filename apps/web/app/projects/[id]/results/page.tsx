'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { GroupList } from '../../../components/GroupList';
import { OpenInGooglePhotosButton } from '../../../components/OpenInGooglePhotosButton';
import { ReviewShell } from '../../../components/ReviewShell';
import { trustCopy } from '../../../copy/trustCopy';
import type { Group, Item } from '../../../../src/types/phase2Envelope';
import {
  type ProjectScanRecord,
  ProjectScanRecordSchema,
  ProjectScanResultsResponseSchema,
  ProjectSchema
} from '../../../../src/types/projects';

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
  const searchParams = useSearchParams();
  const requestedScanId = searchParams.get('scanId');

  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('Project');
  const [scanRecords, setScanRecords] = useState<ProjectScanRecord[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { id } = await params;
        if (cancelled) {
          return;
        }

        setProjectId(id);

        const projectResponse = await fetch(`/api/projects/${id}`);
        const project = ProjectSchema.parse(await projectResponse.json());
        if (cancelled) {
          return;
        }
        setProjectName(project.name);

        const scansResponse = await fetch(`/api/projects/${id}/scans`);
        const scansPayload = ProjectScanRecordSchema.array().parse(
          await scansResponse.json()
        );
        if (cancelled) {
          return;
        }

        setScanRecords(scansPayload);
        setActiveScanId(requestedScanId ?? scansPayload[0]?.id ?? null);
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Unable to load saved results right now.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, requestedScanId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    if (!activeScanId) {
      setGroups([]);
      setReviews({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/scans/${activeScanId}/results`
        );
        const payload = ProjectScanResultsResponseSchema.parse(
          await response.json()
        );
        if (cancelled) {
          return;
        }

        setGroups(payload.envelope.results.groups);
        setReviews(payload.reviews);
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Unable to load saved results right now.');
          setGroups([]);
          setReviews({});
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, activeScanId]);

  const doneCount = useMemo(
    () =>
      groups.filter((group) => reviews[group.groupId]?.state === 'DONE').length,
    [groups, reviews]
  );
  const remainingCount = Math.max(0, groups.length - doneCount);
  const activeScan =
    scanRecords.find((scan) => scan.id === activeScanId) ?? null;

  const updateReview = async (
    groupId: string,
    patch: { keepMediaItemId?: string; state?: Review['state'] }
  ) => {
    const current = reviews[groupId] ?? { state: 'UNREVIEWED' as const };
    const nextReview: Review = {
      ...current,
      ...(patch.keepMediaItemId !== undefined
        ? { keep_media_item_id: patch.keepMediaItemId }
        : {}),
      ...(patch.state ? { state: patch.state } : {})
    };

    setReviews((existing) => ({
      ...existing,
      [groupId]: nextReview
    }));
    setBusyGroupId(groupId);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/groups/${groupId}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch)
        }
      );

      if (!response.ok) {
        throw new Error('review update failed');
      }
      setError(null);
    } catch {
      setError('Unable to save that review change right now.');
    } finally {
      setBusyGroupId(null);
    }
  };

  const copyChecklist = async (targetGroups: Group[]) => {
    if (!navigator.clipboard) {
      setError('Clipboard access is unavailable in this browser.');
      return;
    }

    const text = buildChecklistText(targetGroups, reviews);
    await navigator.clipboard.writeText(text);
    setError(null);
  };

  const exportCsv = async () => {
    if (!projectId || !activeScanId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/export?format=csv&scanId=${activeScanId}`
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-checklist.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError(null);
    } catch {
      setError('Unable to export the checklist right now.');
    }
  };

  return (
    <ReviewShell activeStage="REVIEW">
      <div className="mx-auto max-w-[1140px] pb-12 pt-12">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[760px]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
              Saved results
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-[var(--pp-on-background)]">
              {projectName}
            </h1>
            <p className="mt-5 text-base leading-8 text-[var(--pp-on-surface-muted)]">
              {trustCopy.projects.resultsIntro}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyChecklist(groups)}
              disabled={groups.length === 0}
              className="action-button-primary px-6 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy project checklist
            </button>
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={!activeScanId}
              className="rounded-md bg-[#173057] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#21416f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export CSV
            </button>
            <Link
              href={projectId ? `/projects/${projectId}/run` : '/projects'}
              className="rounded-md bg-[#2a354b] px-6 py-3.5 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
            >
              New scan
            </Link>
          </div>
        </header>

        {error ? (
          <p className="mb-8 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
            {error}
          </p>
        ) : null}

        {scanRecords.length > 1 ? (
          <section className="mb-8 flex flex-wrap gap-3">
            {scanRecords.map((scan) => (
              <Link
                key={scan.id}
                href={`/projects/${projectId}/results?scanId=${scan.id}`}
                className={`rounded-full px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${
                  activeScanId === scan.id
                    ? 'bg-[rgba(90,218,206,0.12)] text-[var(--pp-primary)]'
                    : 'bg-[#22304a] text-[#96a8cf]'
                }`}
              >
                {formatDate(scan.createdAt)}
              </Link>
            ))}
          </section>
        ) : null}

        {isLoading ? (
          <section className="surface-panel rounded-[1rem] px-8 py-10">
            <p className="text-base leading-8 text-[var(--pp-on-surface-muted)]">
              Loading saved results...
            </p>
          </section>
        ) : null}

        {!isLoading && !activeScanId ? (
          <section className="surface-panel rounded-[1rem] px-8 py-10">
            <h2 className="text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
              No saved scans yet
            </h2>
            <p className="mt-4 max-w-[620px] text-base leading-8 text-[var(--pp-on-surface-muted)]">
              Start a project scan to save grouped results and review them
              later.
            </p>
            <Link
              href={projectId ? `/projects/${projectId}/run` : '/projects'}
              className="action-button-primary mt-6 inline-flex px-6 py-3.5 text-sm"
            >
              Start project scan
            </Link>
          </section>
        ) : null}

        {!isLoading && activeScanId ? (
          <>
            <section className="mb-10 grid gap-5 lg:grid-cols-3">
              <article className="surface-panel rounded-[1rem] px-6 py-7">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                  Groups in scan
                </p>
                <p className="mt-3 text-[3rem] font-black tracking-[-0.05em] text-white">
                  {groups.length}
                </p>
              </article>
              <article className="surface-panel rounded-[1rem] px-6 py-7">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
                  Done
                </p>
                <p className="mt-3 text-[3rem] font-black tracking-[-0.05em] text-white">
                  {doneCount}
                </p>
              </article>
              <article className="surface-panel rounded-[1rem] px-6 py-7">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#96a8cf]">
                  Remaining
                </p>
                <p className="mt-3 text-[3rem] font-black tracking-[-0.05em] text-white">
                  {remainingCount}
                </p>
                {activeScan ? (
                  <p className="mt-3 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
                    Saved {formatDate(activeScan.createdAt)}
                  </p>
                ) : null}
              </article>
            </section>

            <section className="mt-10">
              <GroupList
                groups={groups}
                showHeader={false}
                showActions={false}
              />
            </section>

            <section className="mt-10 space-y-5">
              {groups.map((group, index) => {
                const keepId =
                  reviews[group.groupId]?.keep_media_item_id ??
                  group.representativeItemIds[0];
                const removeCandidates = group.items.filter(
                  (item) => item.itemId !== keepId
                );
                const state = reviews[group.groupId]?.state ?? 'UNREVIEWED';

                return (
                  <article
                    key={`${group.groupId}-manual`}
                    className="surface-panel rounded-[1rem] px-8 py-8"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div className="max-w-[680px]">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                          Group {String(index + 1).padStart(2, '0')}
                        </p>
                        <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
                          Keep one photo. Review the rest manually.
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
                          Remove candidates:{' '}
                          {removeCandidates.length > 0
                            ? removeCandidates
                                .map((item) => item.filename || item.itemId)
                                .join(', ')
                            : 'None'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${
                          state === 'DONE'
                            ? 'bg-[rgba(90,218,206,0.12)] text-[var(--pp-primary)]'
                            : 'bg-[#22304a] text-[#96a8cf]'
                        }`}
                      >
                        {state === 'DONE' ? 'Done' : 'Unreviewed'}
                      </span>
                    </div>

                    <div className="mt-8 grid gap-4 xl:grid-cols-2">
                      {group.items.map((item) => (
                        <KeepChoiceCard
                          key={item.itemId}
                          groupId={group.groupId}
                          item={item}
                          isRecommended={group.representativeItemIds.includes(
                            item.itemId
                          )}
                          isSelected={keepId === item.itemId}
                          onSelect={() =>
                            void updateReview(group.groupId, {
                              keepMediaItemId: item.itemId
                            })
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void copyChecklist([group])}
                        className="action-button-primary px-5 py-3 text-sm"
                      >
                        Copy checklist
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateReview(group.groupId, {
                            keepMediaItemId: keepId,
                            state: 'DONE'
                          })
                        }
                        disabled={busyGroupId === group.groupId}
                        className="rounded-md bg-[#173057] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#21416f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyGroupId === group.groupId
                          ? 'Saving...'
                          : 'Mark done'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        ) : null}
      </div>
    </ReviewShell>
  );
}

function KeepChoiceCard({
  groupId,
  item,
  isRecommended,
  isSelected,
  onSelect
}: {
  groupId: string;
  item: Item;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-[1rem] border border-[rgba(99,118,155,0.14)] px-5 py-5">
      <div className="flex items-start gap-4">
        <input
          type="radio"
          name={`keep-choice-${groupId}`}
          aria-label={`Keep ${item.filename}`}
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 border-[#d4dce9]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="truncate text-base font-bold text-[var(--pp-on-background)]">
              {item.filename}
            </p>
            {isRecommended ? (
              <span className="rounded-full bg-[rgba(90,218,206,0.12)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--pp-primary)]">
                Recommended
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
            Keep item: {item.itemId}
          </p>
          <div className="mt-4">
            <OpenInGooglePhotosButton item={item} />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildChecklistText(groups: Group[], reviews: Record<string, Review>) {
  return groups
    .map((group, index) => {
      const keepId =
        reviews[group.groupId]?.keep_media_item_id ??
        group.representativeItemIds[0];
      const removeIds = group.items
        .map((item) => item.itemId)
        .filter((itemId) => itemId !== keepId);
      return [
        `Group ${String(index + 1).padStart(2, '0')}`,
        `Keep: ${keepId}`,
        `Remove candidates: ${removeIds.join(', ') || 'None'}`
      ].join('\n');
    })
    .join('\n\n');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
