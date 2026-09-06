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

const FILLED_FIELDS = {
  partyOneName: "Acme, Inc.",
  partyTwoName: "Beta LLC",
  purpose: "Evaluating a potential business relationship",
  effectiveDate: "2026-09-06",
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityTermType: "years",
  confidentialityTermYears: 1,
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
  modifications: null,
};

/**
 * Stub POST /api/chat so the e2e run doesn't need a real OPENROUTER_API_KEY.
 * `fields` decides how much of the NDA the "AI" has filled in this turn.
 */
async function stubChat(
  page: Page,
  fields: Record<string, unknown>,
  readyToDownload: boolean
): Promise<void> {
  // Drop any previous stub so the newest one is authoritative (routes are LIFO).
  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Thanks — I've noted that down.",
        fields,
        readyToDownload,
      }),
    });
  });
}

async function sendChatMessage(page: Page): Promise<void> {
  await page.getByLabel("Message the assistant").fill("Here are the details");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/noted that down/i).first()).toBeVisible();
}

test.describe("Mutual NDA Creator", () => {
  test("chats to fill the NDA, live-previews it, and downloads a real PDF", async ({
    page,
  }) => {
    await signUp(page);

    // Opens on the assistant greeting, with placeholders in the preview.
    await expect(
      page.getByText(/help you put together a Common Paper Mutual NDA/i)
    ).toBeVisible();
    await expect(page.getByText("[Party 1]")).toBeVisible();

    await stubChat(page, FILLED_FIELDS, true);
    await sendChatMessage(page);

    // The live preview reflects the fields the AI returned.
    await expect(page.getByText("[Party 1]")).toHaveCount(0);
    await expect(
      page.getByText("Between Acme, Inc. and Beta LLC")
    ).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download PDF" });
    await expect(downloadButton).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
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

    await expect(downloadButton).toBeEnabled();
  });

  test("keeps the download button disabled until the chat fills the required fields", async ({
    page,
  }) => {
    await signUp(page);

    const downloadButton = page.getByRole("button", { name: "Download PDF" });
    await expect(downloadButton).toBeDisabled();

    // A turn that only captures the parties is not enough.
    await stubChat(
      page,
      { partyOneName: "Acme, Inc.", partyTwoName: "Beta LLC" },
      false
    );
    await sendChatMessage(page);
    await expect(page.getByText("Between Acme, Inc. and Beta LLC")).toBeVisible();
    await expect(downloadButton).toBeDisabled();

    // A later turn completes the required set.
    await stubChat(page, FILLED_FIELDS, true);
    await page.getByLabel("Message the assistant").fill("The rest of it");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(downloadButton).toBeEnabled();
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
