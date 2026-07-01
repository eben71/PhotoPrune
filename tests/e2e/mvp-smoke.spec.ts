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
  await page.route("https://apis.google.com/js/api.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "",
    }),
  );

  await page.addInitScript(() => {
    type SmokeWindow = Window & {
      gapi?: {
        load: (_lib: string, callback: () => void) => void;
      };
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
        picker: {
          Action: { PICKED: string; CANCEL: string };
          DocsView: typeof SmokeDocsView;
          PickerBuilder: typeof SmokePickerBuilder;
          ViewId: { DOCS_IMAGES: string };
        };
      };
    };

    class SmokeDocsView {
      setMimeTypes() {
        return this;
      }

      setSelectFolderEnabled() {
        return this;
      }

      setIncludeFolders() {
        return this;
      }
    }

    class SmokePickerBuilder {
      callback?: (data: unknown) => void;

      addView() {
        return this;
      }

      setOAuthToken() {
        return this;
      }

      setDeveloperKey() {
        return this;
      }

      setCallback(callback: (data: unknown) => void) {
        this.callback = callback;
        return this;
      }

      setAppId() {
        return this;
      }

      setSelectableMimeTypes() {
        return this;
      }

      build() {
        return {
          setVisible: (visible: boolean) => {
            if (!visible || !this.callback) {
              return;
            }

            window.setTimeout(() => {
              this.callback?.({
                action: "picked",
                docs: [
                  {
                    id: "smoke-photo-1",
                    url: "https://photos.google.com/photo/smoke-photo-1",
                    name: "smoke-photo-1.jpg",
                    mimeType: "image/jpeg",
                    photoMediaMetadata: {
                      width: 1200,
                      height: 800,
                      creationTime: "2026-01-01T00:00:00Z",
                    },
                    thumbnails: [
                      {
                        url: "https://placehold.co/600x400",
                      },
                    ],
                  },
                  {
                    id: "smoke-photo-2",
                    url: "https://photos.google.com/photo/smoke-photo-2",
                    name: "smoke-photo-2.jpg",
                    mimeType: "image/jpeg",
                    photoMediaMetadata: {
                      width: 1200,
                      height: 800,
                      creationTime: "2026-01-01T00:00:01Z",
                    },
                    thumbnails: [
                      {
                        url: "https://placehold.co/600x400",
                      },
                    ],
                  },
                ],
              });
            }, 0);
          },
        };
      }
    }

    const smokeWindow = window as SmokeWindow;

    smokeWindow.gapi = {
      load: (_lib: string, callback: () => void) => callback(),
    };
    smokeWindow.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: "smoke-token" }),
          }),
        },
      },
      picker: {
        Action: { PICKED: "picked", CANCEL: "cancel" },
        DocsView: SmokeDocsView,
        PickerBuilder: SmokePickerBuilder,
        ViewId: { DOCS_IMAGES: "DOCS_IMAGES" },
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
