import { expect, test, type Page } from "playwright/test";

const pageForbiddenPatterns = [
  /\b\d{1,3}%\s+(?:match|similar|similarity|confidence)\b/i,
  /\b(?:match|similar|similarity|confidence)\s+\d{1,3}%\b/i,
  /neural engine/i,
  /digital curator engine/i,
  /deep scan/i,
  /photos pruned/i,
  /recover deleted items/i,
  /write access/i,
  /write scope/i,
  /storage reclaimed/i,
  /local-only/i,
];

async function installGooglePickerStub(page: Page) {
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "",
    }),
  );

  await page.route("https://photospicker.googleapis.com/v1/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (request.method() === "POST" && url.pathname === "/v1/sessions") {
      return json({
        id: "smoke-session",
        pickerUri: "https://photos.google.com/picker/smoke-session",
        pollingConfig: { pollInterval: "0s", timeoutIn: "5s" },
      });
    }

    if (
      request.method() === "GET" &&
      url.pathname === "/v1/sessions/smoke-session"
    ) {
      return json({
        id: "smoke-session",
        pickerUri: "https://photos.google.com/picker/smoke-session",
        mediaItemsSet: true,
        pollingConfig: { pollInterval: "0s", timeoutIn: "5s" },
      });
    }

    if (request.method() === "GET" && url.pathname === "/v1/mediaItems") {
      return json({
        mediaItems: [
          {
            id: "smoke-photo-1",
            createTime: "2026-01-01T00:00:00Z",
            type: "PHOTO",
            productUrl: "https://photos.google.com/photo/smoke-photo-1",
            mediaFile: {
              baseUrl: "https://placehold.co/600x400",
              filename: "smoke-photo-1.jpg",
              mimeType: "image/jpeg",
              mediaFileMetadata: { width: 1200, height: 800 },
            },
          },
          {
            id: "smoke-photo-2",
            createTime: "2026-01-01T00:00:01Z",
            type: "PHOTO",
            productUrl: "https://photos.google.com/photo/smoke-photo-2",
            mediaFile: {
              baseUrl: "https://placehold.co/600x400",
              filename: "smoke-photo-2.jpg",
              mimeType: "image/jpeg",
              mediaFileMetadata: { width: 1200, height: 800 },
            },
          },
        ],
      });
    }

    if (
      request.method() === "DELETE" &&
      url.pathname === "/v1/sessions/smoke-session"
    ) {
      return route.fulfill({ status: 204, body: "" });
    }

    return route.abort();
  });

  await page.addInitScript(() => {
    type SmokeWindow = Window & {
      google?: {
        accounts: {
          oauth2: {
            initTokenClient: (config: {
              callback: (response: { access_token: string }) => void;
            }) => {
              requestAccessToken: () => void;
            };
          };
        };
      };
    };

    const smokeWindow = window as SmokeWindow;
    const pickerWindow = {
      closed: false,
      location: { href: "" },
      close() {
        this.closed = true;
      },
    } as unknown as Window;

    window.open = () => pickerWindow;
    smokeWindow.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: "smoke-token" }),
          }),
        },
      },
    };
  });
}

async function expectNoUnsupportedClaims(page: Page) {
  const visibleText = await page.locator("body").innerText();
  for (const pattern of pageForbiddenPatterns) {
    expect(visibleText, `Unsupported claim matched ${pattern}`).not.toMatch(
      pattern,
    );
  }
}

test("MVP golden path smoke covers scan, review, trust, settings, and account", async ({
  page,
}) => {
  await installGooglePickerStub(page);

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Select from Google Photos" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute(
    "href",
    "/settings",
  );
  await expect(
    page.getByRole("link", { name: "Account status" }),
  ).toHaveAttribute("href", "/account");
  await expectNoUnsupportedClaims(page);

  await page.getByRole("button", { name: "Select from Google Photos" }).click();
  await expect(page).toHaveURL(/\/run$/);
  await expect(
    page.getByRole("heading", { name: "Curating your moments." }),
  ).toBeVisible();
  await expect(page.getByText("Selected items", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start review session" }),
  ).toBeEnabled();
  await expectNoUnsupportedClaims(page);

  await page.getByRole("button", { name: "Start review session" }).click();
  await expect(
    page.getByRole("link", { name: "Review current results" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review current results" }).click();

  await expect(page).toHaveURL(/\/results$/);
  await expect(
    page.getByRole("heading", { name: "Review Groups" }),
  ).toBeVisible();
  await expect(page.getByText("High Confidence").first()).toBeVisible();
  await expect(
    page.getByText("You review each group before anything changes."),
  ).toBeVisible();
  await expect(
    page.getByText("You decide what to keep, what to skip").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all items" }).first().click();
  await expect(
    page.getByRole("button", { name: "Open in Google Photos" }).first(),
  ).toBeVisible();
  await expectNoUnsupportedClaims(page);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(
    page.getByText("Google Photos picker, read-only selection"),
  ).toBeVisible();
  await expect(page.getByText("Not available in MVP")).toBeVisible();
  await expectNoUnsupportedClaims(page);

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Account status" }),
  ).toBeVisible();
  await expect(page.getByText("Read-only picker selection")).toBeVisible();
  await expect(
    page.getByText("Full account settings are not part of this MVP"),
  ).toBeVisible();
  await expectNoUnsupportedClaims(page);
});
