'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { trustCopy } from '../../copy/trustCopy';
import { ProjectSchema } from '../../../src/types/projects';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createProject = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }

      const project = ProjectSchema.parse(await response.json());
      router.push(`/projects/${project.id}/run`);
    } catch {
      setError('Unable to create this project right now.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="app-bg min-h-screen">
      <main className="page-shell desktop-gutter pb-20 pt-16">
        <section className="mx-auto max-w-[780px]">
          <Link
            href="/projects"
            className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]"
          >
            Back to projects
          </Link>

          <div className="surface-panel mt-6 rounded-[1rem] px-8 py-10">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
              New project
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-[var(--pp-on-background)]">
              Start a recurring cleanup workflow.
            </h1>
            <p className="mt-5 text-base leading-8 text-[var(--pp-on-surface-muted)]">
              {trustCopy.projects.newIntro}
            </p>

            <label className="mt-8 block">
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-secondary)]">
                Project name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekend cleanup"
                className="mt-3 w-full rounded-xl border border-[rgba(99,118,155,0.18)] bg-[rgba(6,12,24,0.35)] px-4 py-4 text-base text-[var(--pp-on-background)] outline-none transition focus:border-[var(--pp-primary)]"
              />
            </label>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void createProject()}
                disabled={!name.trim() || isCreating}
                className="action-button-primary px-8 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Creating...' : 'Create project'}
              </button>
              <Link
                href="/projects"
                className="rounded-md bg-[#2a354b] px-8 py-3.5 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
              >
                Cancel
              </Link>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-6 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]"
              >
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

async function readErrorMessage(response: Response) {
  const fallback = 'Unable to create this project right now.';
  const body = await response.text();
  if (!body.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(body) as {
      detail?: string;
      error?: string;
      message?: string;
    };

    return parsed.detail ?? parsed.error ?? parsed.message ?? fallback;
  } catch {
    return body;
  }
}
