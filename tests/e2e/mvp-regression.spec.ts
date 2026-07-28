import { expect, test } from "playwright/test";

import { fixtureEnvelope, seedCompletedSession } from "./helpers/session";
import { expectNoUnsupportedClaims } from "./helpers/trustAssertions";

test("session guards keep run and results routes truthful", async ({
  page,
}) => {
  await page.goto("/run");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/results");
  await expect(
    page.getByRole("heading", { name: "Start a new review to continue." }),
  ).toBeVisible();
  await expect(page.getByText("Session Expired")).toBeVisible();
  await expectNoUnsupportedClaims(page);
});

test("PP-016 exposes only supported exact links and honest unavailable states", async ({
  context,
  page,
}) => {
  await seedCompletedSession(
    page,
    "https://photos.google.com/photo/exact-smoke-item",
  );
  await page.goto("/results");
  await page.getByRole("button", { name: "Show all items" }).first().click();

  const exactLink = page
    .getByRole("link", { name: "Open exact photo in Google Photos" })
    .first();
  await expect(exactLink).toHaveAttribute(
    "href",
    "https://photos.google.com/photo/exact-smoke-item",
  );
  await expect(exactLink).toHaveAttribute("target", "_blank");
  await expect(exactLink).toHaveAttribute("rel", "noopener noreferrer");
  const [exactPhotoPage] = await Promise.all([
    context.waitForEvent("page"),
    exactLink.click(),
  ]);
  await expect(exactPhotoPage).not.toBeNull();
  await exactPhotoPage.close();
  await expect(
    page.getByText("Exact Google Photos link unavailable").first(),
  ).toBeVisible();
  await expectNoUnsupportedClaims(page);
});

test("PP-006 ephemeral review stays representative and non-persistent", async ({
  page,
}) => {
  await seedCompletedSession(page);
  await page.goto("/results");

  await expect(page.getByText("Representative Photo").first()).toBeVisible();
  await expect(
    page.getByText(/temporary review does not save group decisions/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/Keep Recommended/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Mark done/i })).toHaveCount(0);
  await expectNoUnsupportedClaims(page);
});

test("saved-project review decisions persist through the browser contract", async ({
  page,
}) => {
  const envelope = structuredClone(fixtureEnvelope);
  envelope.results.groups = [envelope.results.groups[0]];
  envelope.results.summary.groupsCount = 1;

  await page.route("**/api/projects/p1", (route) =>
    route.fulfill({
      json: {
        id: "p1",
        name: "Smoke project",
        status: "active",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-01T00:00:00Z",
      },
    }),
  );
  await page.route("**/api/projects/p1/scans", (route) =>
    route.fulfill({
      json: [
        {
          id: "s1",
          projectId: "p1",
          createdAt: "2026-07-01T00:00:00Z",
          sourceType: "picker",
          sourceRef: {},
        },
      ],
    }),
  );
  await page.route("**/api/projects/p1/scans/s1/results", (route) =>
    route.fulfill({
      json: { projectScanId: "s1", envelope, reviews: {} },
    }),
  );
  await page.route("**/api/projects/p1/scans/s1/diff", (route) =>
    route.fulfill({
      json: {
        projectId: "p1",
        projectScanId: "s1",
        previousProjectScanId: null,
        summary: {
          totalGroups: 1,
          new: 1,
          changed: 0,
          unchanged: 0,
          previouslyReviewedUnchanged: 0,
          requiresReview: 1,
        },
        groups: [
          {
            groupFingerprint: "group-1",
            category: "NEW",
            memberMediaItemIds: ["item-1", "item-2", "item-3"],
            reviewState: "UNREVIEWED",
            priorReviewStatePreserved: false,
            previouslyReviewed: false,
            requiresReview: true,
          },
        ],
      },
    }),
  );

  const reviewRequests: Array<Record<string, unknown>> = [];
  await page.route(
    "**/api/projects/p1/groups/group-1/review",
    async (route) => {
      const patch = route.request().postDataJSON() as Record<string, unknown>;
      reviewRequests.push(patch);
      await route.fulfill({
        json: {
          state: patch.state ?? "IN_PROGRESS",
          keep_media_item_id: patch.keepMediaItemId ?? "item-2",
        },
      });
    },
  );

  await page.goto("/projects/p1/results");
  await expect(
    page.getByText("Choose a representative. Review the rest manually."),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Choose IMG_0001_COPY.JPG as representative" })
    .click();
  await expect.poll(() => reviewRequests.length).toBe(1);
  expect(reviewRequests[0]).toEqual({
    keepMediaItemId: "item-2",
    state: "IN_PROGRESS",
  });

  await page.getByRole("button", { name: "Mark done" }).click();
  await expect.poll(() => reviewRequests.length).toBe(2);
  expect(reviewRequests[1]).toEqual({ state: "DONE" });
  await expect(page.getByText("Done").last()).toBeVisible();
  await expectNoUnsupportedClaims(page);
});

test.describe("narrow viewport navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps Settings and Account reachable and MVP-scoped", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Account status" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Not available in MVP")).toBeVisible();

    await page.getByRole("link", { name: "Account status" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("heading", { name: "Account status" }),
    ).toBeVisible();
    await expect(
      page.getByText("Full account settings are not part of this MVP"),
    ).toBeVisible();
    await expectNoUnsupportedClaims(page);
  });
});
