import type { Page } from "playwright/test";

export async function installGooglePhotosPickerStub(page: Page) {
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
          pickerItem("smoke-photo-1", "smoke-photo-1.jpg"),
          pickerItem("smoke-photo-2", "smoke-photo-2.jpg"),
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

function pickerItem(id: string, filename: string) {
  return {
    id,
    createTime: "2026-01-01T00:00:00Z",
    type: "PHOTO",
    mediaFile: {
      baseUrl: `https://example.invalid/${id}`,
      filename,
      mimeType: "image/jpeg",
      mediaFileMetadata: { width: 1200, height: 800 },
    },
  };
}
