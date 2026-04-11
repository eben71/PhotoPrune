'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppIcon } from '../components/AppIcon';
import { trustCopy } from '../copy/trustCopy';
import {
  type Project,
  ProjectListResponseSchema
} from '../../src/types/projects';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          setError('Unable to load projects right now.');
          setProjects([]);
          return;
        }

        const body = await response.text();
        if (!body.trim()) {
          setProjects([]);
          return;
        }

        const parsed = ProjectListResponseSchema.parse(JSON.parse(body));
        setProjects(parsed.projects);
        setError(null);
      } catch {
        setError('Unable to load projects right now.');
        setProjects([]);
      }
    })();
  }, []);

  return (
    <div className="app-bg min-h-screen">
      <main className="page-shell desktop-gutter pb-20 pt-16">
        <section className="mx-auto max-w-[1120px]">
          <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[720px]">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                Saved Projects
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-[var(--pp-on-background)]">
                Return to cleanup work without starting over.
              </h1>
              <p className="mt-5 text-base leading-8 text-[var(--pp-on-surface-muted)]">
                {trustCopy.projects.listIntro}
              </p>
            </div>

            <Link
              href="/projects/new"
              className="action-button-primary px-8 py-3.5 text-sm"
            >
              New project
            </Link>
          </header>

          {error ? (
            <p className="mb-8 rounded-xl bg-[rgba(127,41,39,0.45)] px-4 py-3 text-sm text-[#ffd1cd]">
              {error}
            </p>
          ) : null}

          {projects.length === 0 ? (
            <section className="surface-panel rounded-[1rem] px-8 py-10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(90,218,206,0.12)] text-[var(--pp-primary)]">
                  <AppIcon name="review" className="h-[20px] w-[20px]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
                    No projects yet
                  </h2>
                  <p className="mt-4 max-w-[620px] text-base leading-8 text-[var(--pp-on-surface-muted)]">
                    Create a project before scanning so the results and review
                    progress can be reopened later.
                  </p>
                  <Link
                    href="/projects/new"
                    className="action-button-primary mt-6 inline-flex px-6 py-3 text-sm"
                  >
                    Create your first project
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="surface-panel rounded-[1rem] px-7 py-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--pp-primary)]">
                        {project.status}
                      </p>
                      <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--pp-on-background)]">
                        {project.name}
                      </h2>
                    </div>
                    <span className="rounded-full bg-[rgba(90,218,206,0.12)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--pp-primary)]">
                      {project.scope?.type === 'album_set'
                        ? trustCopy.projects.scopeAlbumSet
                        : trustCopy.projects.scopePicker}
                    </span>
                  </div>

                  <dl className="mt-6 space-y-3 text-sm leading-7 text-[var(--pp-on-surface-muted)]">
                    <div className="flex items-center justify-between gap-4">
                      <dt>Updated</dt>
                      <dd>{formatDate(project.updatedAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>Created</dt>
                      <dd>{formatDate(project.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="action-button-primary px-5 py-3 text-sm"
                    >
                      Open project
                    </Link>
                    <Link
                      href={`/projects/${project.id}/run`}
                      className="rounded-md bg-[#2a354b] px-5 py-3 text-sm font-bold text-[#d5def2] transition hover:bg-[#344159]"
                    >
                      New scan
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
