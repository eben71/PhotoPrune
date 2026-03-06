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

  const loadProjects = async () => {
    const response = await fetch('/api/projects');
    const parsed = ProjectListResponseSchema.parse(await response.json());
    setProjects(parsed.projects);
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const createProject = async () => {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    setName('');
    await loadProjects();
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
        disabled={!name.trim()}
      >
        Create project
      </button>
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
