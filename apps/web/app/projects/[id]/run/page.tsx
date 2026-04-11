'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ReviewShell } from '../../../components/ReviewShell';
import { trustCopy } from '../../../copy/trustCopy';
import {
  normalizePickerSelection,
  useGooglePhotosPicker
} from '../../../hooks/useGooglePhotosPicker';
import { useRunSession } from '../../../state/runSessionStore';
import {
  ProjectScanResponseSchema,
  ProjectSchema
} from '../../../../src/types/projects';

export default function ProjectRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('Project');
  const [scopeLabel, setScopeLabel] = useState<string>(
    trustCopy.projects.scopePicker
  );
  const [error, setError] = useState<string | null>(null);
  const { state, setSelection } = useRunSession();
  const { openPicker, isLoading, error: pickerError } = useGooglePhotosPicker();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { id } = await params;
      if (cancelled) {
        return;
      }

      setProjectId(id);

      try {
        const response = await fetch(`/api/projects/${id}`);
        const project = ProjectSchema.parse(await response.json());
        if (cancelled) {
          return;
        }

        setProjectName(project.name);
        setScopeLabel(
          project.scope?.type === 'album_set'
            ? trustCopy.projects.scopeAlbumSet
            : trustCopy.projects.scopePicker
        );
      } catch {
        if (!cancelled) {
          setError('Unable to load this project right now.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const handleStart = async () => {
    if (!projectId || state.selection.length === 0) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType: 'picker',
        sourceRef: { type: 'picker' },
        photoItems: state.selection.map((item) => ({
          id: item.id,
          createTime: item.createTime,
          filename: item.filename,
          mimeType: item.mimeType,
          width: 300,
          height: 300
        }))
      })
    });

    if (!response.ok) {
      setError(
        'Unable to start this saved scan. Verify API connectivity and try again.'
      );
      return;
    }

    const payload = ProjectScanResponseSchema.parse(await response.json());
    router.push(
      `/projects/${projectId}/results?scanId=${payload.projectScanId}`
    );
  };

  const handleSelect = async () => {
    const items = await openPicker();
    if (!items || items.length === 0) {
      return;
    }
    setSelection(normalizePickerSelection(items));
    setError(null);
  };

  return (
    <ReviewShell activeStage="SCANNING">
      <div className="mx-auto max-w-[1040px] pb-16 pt-12">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[720px]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
              Project scan
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-[var(--pp-on-background)]">
              {projectName}
            </h1>
            <p className="mt-5 text-base leading-8 text-[var(--pp-on-surface-muted)]">
              {trustCopy.projects.runIntro}
            </p>
          </div>

          <Link
            href={projectId ? `/projects/${projectId}` : '/projects'}
            className="rounded-md bg-[#2a354b] px-8 py-3.5 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
          >
            Back to project
          </Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="surface-panel-light confidence-band-high rounded-[1rem] px-8 py-8">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(79,85,99,0.8)]">
              Source
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--pp-paper-text)]">
              {scopeLabel}
            </h2>
            <p className="mt-4 max-w-[620px] text-sm leading-7 text-[var(--pp-paper-muted)]">
              PhotoPrune only saves metadata, group fingerprints, and your
              manual review choices. No photo bytes or deletion actions are
              stored here.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSelect()}
                disabled={isLoading}
                className="action-button-primary px-8 py-3.5 text-sm"
              >
                {isLoading
                  ? 'Opening Google Photos...'
                  : 'Select from Google Photos'}
              </button>
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={!projectId || state.selection.length === 0}
                className="rounded-md bg-[#173057] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#21416f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start saved scan
              </button>
            </div>
          </article>

          <article className="surface-panel rounded-[1rem] px-6 py-7">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
              Current selection
            </p>
            <p className="mt-4 text-[3rem] font-black tracking-[-0.05em] text-white">
              {state.selection.length}
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
              {trustCopy.projects.resultsReminder}
            </p>
          </article>
        </section>

        {pickerError ? (
          <p className="mt-6 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
            {pickerError}
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
            {error}
          </p>
        ) : null}
      </div>
    </ReviewShell>
  );
}
