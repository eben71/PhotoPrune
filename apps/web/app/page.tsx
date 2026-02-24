'use client';

import { useRouter } from 'next/navigation';

import { sampleSelection } from './data/sampleSelection';
import { useRunSession } from './state/runSessionStore';
import { trustCopy } from './copy/trustCopy';

export default function HomePage() {
  const router = useRouter();
  const { setSelection, clearSelection } = useRunSession();

  const handleStart = () => {
    setSelection(sampleSelection);
    router.push('/run');
  };

  const handleReset = () => {
    clearSelection();
    router.push('/');
  };

  return (
    <section>
      <h1>{trustCopy.landing.header}</h1>
      <p>{trustCopy.landing.subheader}</p>
      {trustCopy.landing.safetyLines.map((line) => (
        <p key={line}>{line}</p>
      ))}

      <section>
        <h2>{trustCopy.landing.doesTitle}</h2>
        <ul>
          {trustCopy.landing.doesBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{trustCopy.landing.doesNotTitle}</h2>
        <ul>
          {trustCopy.landing.doesNotBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section>
        {trustCopy.landing.sessionWarning.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section>
        {trustCopy.landing.capNotice.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <button type="button" onClick={handleStart}>
        {trustCopy.landing.primaryButton}
      </button>
      <button type="button" onClick={handleReset}>
        {trustCopy.landing.secondaryButton}
      </button>
    </section>
  );
}
