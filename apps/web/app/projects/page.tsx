'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  type Project,
  ProjectListResponseSchema
} from '../../src/types/projects';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
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
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const createProject = async () => {
    setError('');
    setIsCreating(true);

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

      setName('');
      await loadProjects();
    } catch {
      setError(
        'Unable to create project. Check that the web app can reach the API.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section>
      <h1>Projects</h1>
      <p>Create a recurring cleanup campaign. Manual-only, no auto-delete.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
      />
      <button
        type="button"
        onClick={() => void createProject()}
        disabled={!name.trim() || isCreating}
      >
        {isCreating ? 'Creating...' : 'Create project'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`}>{project.name}</Link> (
            {project.status})
          </li>
        ))}
      </ul>
    </section>
  );
}

async function readErrorMessage(response: Response) {
  const fallback =
    response.status === 503
      ? 'PhotoPrune API is unavailable. Start the API service and retry.'
      : 'Unable to create project.';

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
