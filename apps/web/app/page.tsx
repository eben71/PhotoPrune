'use client';

import { useRouter } from 'next/navigation';

import { InlineDisclosure } from './components/InlineDisclosure';
import { sampleSelection } from './data/sampleSelection';
import { useRunSession } from './state/runSessionStore';

export default function HomePage() {
  const router = useRouter();
  const { setSelection, clearSelection } = useRunSession();

  const handleStart = () => {
    setSelection(sampleSelection);
    router.push('/run');
  };

  const handleReset = () => {
    clearSelection();
  };

  return (
    <section>
      <h1>PhotoPrune</h1>
      <p>PhotoPrune does not delete anything.</p>
      <p>
        You’ll review groups here and open items in Google Photos to manage
        them.
      </p>
      <p>This uses Google Photos API calls for this session.</p>

      <button type="button" onClick={handleStart}>
        Select photos
      </button>
      <button type="button" onClick={handleReset}>
        Clear session
      </button>

      <InlineDisclosure summary="Why only selected photos?">
        The MVP only works with items you explicitly pick in Google Photos. No
        library-wide scanning or background sync happens in this phase.
      </InlineDisclosure>
    </section>
  );
}
