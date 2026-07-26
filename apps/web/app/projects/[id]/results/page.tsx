'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { GroupList } from '../../../components/GroupList';
import { OpenInGooglePhotosButton } from '../../../components/OpenInGooglePhotosButton';
import { ReviewShell } from '../../../components/ReviewShell';
import { trustCopy } from '../../../copy/trustCopy';
import { useRunSession } from '../../../state/runSessionStore';
import type {
  Group,
  Item,
  ItemIssue
} from '../../../../src/types/phase2Envelope';
import {
  type ProjectScanDiffGroup,
  type ProjectScanDiffResponse,
  ProjectScanDiffResponseSchema,
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
  const { state: runSessionState, hydrated: runSessionHydrated } =
    useRunSession();

  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('Project');
  const [scanRecords, setScanRecords] = useState<ProjectScanRecord[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [failedItems, setFailedItems] = useState<ItemIssue[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [diff, setDiff] = useState<ProjectScanDiffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [busyGroupIds, setBusyGroupIds] = useState<Set<string>>(new Set());
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
      setFailedItems([]);
      setReviews({});
      setDiff(null);
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
        const diffResponse = await fetch(
          `/api/projects/${projectId}/scans/${activeScanId}/diff`
        );
        const diffPayload = ProjectScanDiffResponseSchema.parse(
          await diffResponse.json()
        );
        if (cancelled) {
          return;
        }

        const immediateResults =
          runSessionHydrated && runSessionState.projectScanId === activeScanId
            ? runSessionState.results
            : null;
        setGroups(immediateResults?.groups ?? payload.envelope.results.groups);
        setFailedItems(
          immediateResults?.failedItems ?? payload.envelope.results.failedItems
        );
        setReviews(payload.reviews);
        setDiff(diffPayload);
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Unable to load saved results right now.');
          setGroups([]);
          setFailedItems([]);
          setReviews({});
          setDiff(null);
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
  }, [
    projectId,
    activeScanId,
    runSessionHydrated,
    runSessionState.projectScanId,
    runSessionState.results
  ]);

  const doneCount = useMemo(
    () =>
      groups.filter((group) => reviews[group.groupId]?.state === 'DONE').length,
    [groups, reviews]
  );
  const remainingCount = Math.max(0, groups.length - doneCount);
  const activeScan =
    scanRecords.find((scan) => scan.id === activeScanId) ?? null;
  const diffByGroup = useMemo(() => {
    return new Map(
      (diff?.groups ?? []).map((groupDiff) => [
        groupDiff.groupFingerprint,
        groupDiff
      ])
    );
  }, [diff]);
  const orderedGroups = useMemo(() => {
    const priority = { CHANGED: 0, NEW: 1, UNCHANGED: 2 } as const;
    return [...groups].sort((left, right) => {
      const leftDiff = diffByGroup.get(left.groupId);
      const rightDiff = diffByGroup.get(right.groupId);
      return (
        (priority[leftDiff?.category ?? 'UNCHANGED'] ?? 2) -
        (priority[rightDiff?.category ?? 'UNCHANGED'] ?? 2)
      );
    });
  }, [diffByGroup, groups]);

  const updateReview = async (
    groupId: string,
    patch: { keepMediaItemId?: string; state?: Review['state'] }
  ) => {
    if (busyGroupIds.has(groupId)) {
      return;
    }

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
    setBusyGroupIds((existing) => new Set(existing).add(groupId));

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
      const savedReview = normalizeReviewResponse(
        await response.json().catch(() => null)
      );
      if (savedReview) {
        setReviews((existing) => ({
          ...existing,
          [groupId]: savedReview
        }));
      }
      setReviewErrors((existing) => {
        const next = { ...existing };
        delete next[groupId];
        return next;
      });
    } catch {
      setReviews((existing) => ({
        ...existing,
        [groupId]: current
      }));
      setReviewErrors((existing) => ({
        ...existing,
        [groupId]: 'Unable to save that review change right now.'
      }));
    } finally {
      setBusyGroupIds((existing) => {
        const next = new Set(existing);
        next.delete(groupId);
        return next;
      });
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
      if (!response.ok) {
        throw new Error('Export request failed.');
      }
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

  const exportJson = async () => {
    if (!projectId || !activeScanId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/export?format=json&scanId=${activeScanId}`
      );
      if (!response.ok) {
        throw new Error('Export request failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-checklist.json`;
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
            <button
              type="button"
              onClick={() => void exportJson()}
              disabled={!activeScanId}
              className="rounded-md bg-[#173057] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#21416f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export JSON
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

        {failedItems.length > 0 ? (
          <section className="mb-8 rounded-xl bg-[rgba(255,207,112,0.12)] px-5 py-4 text-sm text-[#ffe6ad]">
            <p className="font-bold">
              {trustCopy.projects.partialScanHeading(failedItems.length)}
            </p>
            <p className="mt-2 leading-7">
              {trustCopy.projects.partialScanBody}
            </p>
          </section>
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

            {diff ? (
              <section className="mb-10 grid gap-5 lg:grid-cols-3">
                <DiffSummaryCard
                  label="New since last scan"
                  count={diff.summary.new}
                  tone="primary"
                />
                <DiffSummaryCard
                  label="Changed since last scan"
                  count={diff.summary.changed}
                  detail="Review needed"
                  tone="secondary"
                />
                <DiffSummaryCard
                  label="Previously reviewed"
                  count={diff.summary.previouslyReviewedUnchanged}
                  detail="Unchanged groups stay done"
                  tone="muted"
                />
              </section>
            ) : null}

            <section className="mt-10">
              <GroupList
                groups={groups}
                showHeader={false}
                showActions={false}
              />
            </section>

            <section className="mt-10 space-y-5">
              {orderedGroups.map((group, index) => {
                const selectedRepresentativeId =
                  reviews[group.groupId]?.keep_media_item_id ?? null;
                const removeCandidates = selectedRepresentativeId
                  ? group.items.filter(
                      (item) => item.itemId !== selectedRepresentativeId
                    )
                  : [];
                const state = reviews[group.groupId]?.state ?? 'UNREVIEWED';
                const isBusy = busyGroupIds.has(group.groupId);
                const groupDiff = diffByGroup.get(group.groupId);
                const isPreviouslyReviewed =
                  groupDiff?.previouslyReviewed === true;

                return (
                  <article
                    key={`${group.groupId}-manual`}
                    className={`surface-panel rounded-[1rem] px-8 py-8 ${
                      isPreviouslyReviewed ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div className="max-w-[680px]">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                          Group {String(index + 1).padStart(2, '0')}
                        </p>
                        <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
                          Choose a representative. Review the rest manually.
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
                          Remove candidates:{' '}
                          {!selectedRepresentativeId
                            ? 'Choose a representative first'
                            : removeCandidates.length > 0
                              ? removeCandidates
                                  .map((item) => item.filename || item.itemId)
                                  .join(', ')
                              : 'None'}
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <DiffBadge groupDiff={groupDiff} />
                        <span
                          className={`rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${
                            state === 'DONE'
                              ? 'bg-[rgba(90,218,206,0.12)] text-[var(--pp-primary)]'
                              : 'bg-[#22304a] text-[#96a8cf]'
                          }`}
                        >
                          {state === 'DONE'
                            ? 'Done'
                            : state === 'SNOOZED'
                              ? 'Skipped for now'
                              : state === 'IN_PROGRESS'
                                ? 'In progress'
                                : 'Unreviewed'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 xl:grid-cols-2">
                      {group.items.map((item) => (
                        <KeepChoiceCard
                          key={item.itemId}
                          groupId={group.groupId}
                          item={item}
                          isRepresentative={group.representativeItemIds.includes(
                            item.itemId
                          )}
                          isSelected={selectedRepresentativeId === item.itemId}
                          disabled={isBusy}
                          onSelect={() =>
                            void updateReview(group.groupId, {
                              keepMediaItemId: item.itemId,
                              state: 'IN_PROGRESS'
                            })
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void updateReview(group.groupId, {
                            state: 'SNOOZED'
                          })
                        }
                        disabled={isBusy}
                        className="rounded-md border border-[#52617d] px-5 py-3 text-sm font-bold text-[#c5d0e7] transition hover:bg-[#18243a] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? 'Saving...' : 'Skip for now'}
                      </button>
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
                            state: 'DONE'
                          })
                        }
                        disabled={isBusy || !selectedRepresentativeId}
                        className="rounded-md bg-[#173057] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#21416f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? 'Saving...' : 'Mark done'}
                      </button>
                    </div>
                    {reviewErrors[group.groupId] ? (
                      <p className="mt-4 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
                        {reviewErrors[group.groupId]}
                      </p>
                    ) : null}
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

function DiffSummaryCard({
  label,
  count,
  detail,
  tone
}: {
  label: string;
  count: number;
  detail?: string;
  tone: 'primary' | 'secondary' | 'muted';
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-[var(--pp-primary)]'
      : tone === 'secondary'
        ? 'text-[var(--pp-secondary)]'
        : 'text-[#96a8cf]';

  return (
    <article className="surface-panel rounded-[1rem] px-6 py-7">
      <p
        className={`text-[0.62rem] font-bold uppercase tracking-[0.18em] ${toneClass}`}
      >
        {label}
      </p>
      <p className="mt-3 text-[3rem] font-black tracking-[-0.05em] text-white">
        {count}
      </p>
      {detail ? (
        <p className="mt-3 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
          {detail}
        </p>
      ) : null}
    </article>
  );
}

function DiffBadge({
  groupDiff
}: {
  groupDiff: ProjectScanDiffGroup | undefined;
}) {
  if (groupDiff?.category === 'NEW') {
    return (
      <span className="rounded-full bg-[rgba(90,218,206,0.12)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--pp-primary)]">
        New since last scan
      </span>
    );
  }

  if (groupDiff?.category === 'CHANGED') {
    return (
      <span className="rounded-full bg-[rgba(255,207,112,0.16)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#ffd982]">
        Changed since last scan - review needed
      </span>
    );
  }

  if (groupDiff?.previouslyReviewed) {
    return (
      <span className="rounded-full bg-[#22304a] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#96a8cf]">
        Previously reviewed
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#22304a] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#96a8cf]">
      Unchanged
    </span>
  );
}

function KeepChoiceCard({
  groupId,
  item,
  isRepresentative,
  isSelected,
  disabled,
  onSelect
}: {
  groupId: string;
  item: Item;
  isRepresentative: boolean;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-[1rem] border border-[rgba(99,118,155,0.14)] px-5 py-5">
      <div className="flex items-start gap-4">
        <input
          type="radio"
          name={`keep-choice-${groupId}`}
          aria-label={`Choose ${item.filename} as representative`}
          checked={isSelected}
          disabled={disabled}
          onChange={onSelect}
          className="mt-1 h-4 w-4 border-[#d4dce9]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="truncate text-base font-bold text-[var(--pp-on-background)]">
              {item.filename}
            </p>
            {isRepresentative ? (
              <span className="rounded-full bg-[rgba(90,218,206,0.12)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--pp-primary)]">
                Representative
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
            Item ID: {item.itemId}
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
      const representativeId =
        reviews[group.groupId]?.keep_media_item_id ?? null;
      const reviewCandidateIds = representativeId
        ? group.items
            .map((item) => item.itemId)
            .filter((itemId) => itemId !== representativeId)
        : group.items.map((item) => item.itemId);
      return [
        `Group ${String(index + 1).padStart(2, '0')}`,
        `Representative: ${representativeId ?? 'Not selected'}`,
        `Review candidates: ${reviewCandidateIds.join(', ') || 'None'}`
      ].join('\n');
    })
    .join('\n\n');
}

function normalizeReviewResponse(value: unknown): Review | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const state = payload.state;
  if (
    state !== 'UNREVIEWED' &&
    state !== 'IN_PROGRESS' &&
    state !== 'DONE' &&
    state !== 'SNOOZED'
  ) {
    return null;
  }
  const keepMediaItemId =
    payload.keepMediaItemId ?? payload.keep_media_item_id ?? null;
  const notes = payload.notes ?? null;
  return {
    state,
    keep_media_item_id:
      typeof keepMediaItemId === 'string' ? keepMediaItemId : null,
    notes: typeof notes === 'string' ? notes : null
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
