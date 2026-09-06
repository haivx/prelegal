import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * The platform sits behind the fake-login screen (PREL-4). Each test
 * creates a fresh account, which also lands us on `/` signed in.
 */
async function signUp(page: Page): Promise<void> {
  const email = `founder+${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@acmecorp.com`;

  await page.goto("/login");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();
}

test.describe("Mutual NDA Creator", () => {
  test("fills the form, live-previews the NDA, and downloads a real PDF", async ({
    page,
  }) => {
    await signUp(page);

    // The preview starts with placeholders before the form is filled in.
    await expect(page.getByText("[Party 1]")).toBeVisible();

    await page.getByLabel("Party 1 name").fill("Acme, Inc.");
    await page.getByLabel("Party 2 name").fill("Beta LLC");
    await page.getByLabel("Governing law (state)").fill("Delaware");
    await page
      .getByLabel("Jurisdiction")
      .fill("courts located in New Castle, DE");

    // The live preview reflects the form as it's filled in.
    await expect(page.getByText("[Party 1]")).toHaveCount(0);
    await expect(
      page.getByText("Between Acme, Inc. and Beta LLC")
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      "Mutual-NDA-Acme-Inc-Beta-LLC.pdf"
    );

    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = await readFile(path as string);

    // A real PDF, not an empty or truncated file.
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(5_000);

    // The button returns to its normal, enabled state once the download
    // has been handed to the browser.
    await expect(
      page.getByRole("button", { name: "Download PDF" })
    ).toBeEnabled();
  });

  test("blocks submission via native validation until required fields are filled", async ({
    page,
  }) => {
    await signUp(page);

    let downloadFired = false;
    page.on("download", () => {
      downloadFired = true;
    });

    await page.getByRole("button", { name: "Download PDF" }).click();
    // Give the (unwanted) download a moment to fire before asserting it didn't.
    await page.waitForTimeout(500);

    expect(downloadFired).toBe(false);
    // The first empty required field (Party 1 name) is the one the browser
    // flags as invalid and blocks submission on.
    const isValid = await page
      .getByLabel("Party 1 name")
      .evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });
});

test.describe("Fake login", () => {
  test("redirects anonymous visitors from the platform to the login screen", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();
  });

  test("rejects a sign-in with unknown credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@acmecorp.com");
    await page.getByLabel("Password").fill("wrong password here");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText(/incorrect email or password/i)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
