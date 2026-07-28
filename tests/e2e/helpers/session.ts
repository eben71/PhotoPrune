import type { Page } from "playwright/test";

import fixtureEnvelope from "../../../apps/web/tests/fixtures/phase2_2_sample_results.json";

const sessionKey = "photoprune-session-v2";

export async function seedCompletedSession(
  page: Page,
  exactGooglePhotosUrl?: string,
) {
  const envelope = structuredClone(fixtureEnvelope);
  envelope.results.groups[0].items[0].links.googlePhotos.url =
    exactGooglePhotosUrl ?? null;

  await page.addInitScript(
    ({ key, completedEnvelope }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          selection: [],
          projectScanId: null,
          run: completedEnvelope.run,
          progress: completedEnvelope.progress,
          telemetry: completedEnvelope.telemetry,
          results: completedEnvelope.results,
        }),
      );
    },
    { key: sessionKey, completedEnvelope: envelope },
  );
}

export { fixtureEnvelope };
