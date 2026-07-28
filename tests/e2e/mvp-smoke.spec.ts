import { expect, test } from "playwright/test";

import { installGooglePhotosPickerStub } from "./helpers/googlePhotosPicker";
import { expectNoUnsupportedClaims } from "./helpers/trustAssertions";

test("MVP golden path smoke covers scan, review, trust, settings, and account", async ({
  page,
}) => {
  await installGooglePhotosPickerStub(page);

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
    page.getByRole("heading", { name: "Reviewing your selected photos." }),
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
    page.getByText("Exact Google Photos link unavailable").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open exact photo in Google Photos" }),
  ).toHaveCount(0);
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
