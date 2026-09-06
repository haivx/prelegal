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

const CATALOG = [
  {
    id: "mutual-nda",
    name: "Mutual Non-Disclosure Agreement",
    description: "Mutual NDA standard terms.",
  },
  {
    id: "csa",
    name: "Cloud Service Agreement",
    description: "SaaS terms.",
  },
];

const NDA_DETAIL = {
  id: "mutual-nda",
  name: "Mutual Non-Disclosure Agreement",
  description: "Common Paper mutual NDA standard terms.",
  templateMarkdown:
    '# Standard Terms\n\n1. This MNDA commences on the ' +
    '<span class="coverpage_link">Effective Date</span> and is governed by ' +
    '<span class="coverpage_link">Governing Law</span> law.',
  fields: ["Purpose", "Effective Date", "Governing Law", "Jurisdiction"],
};

const CORE_FIELDS = [
  { label: "Purpose", value: "Evaluating a potential deal" },
  { label: "Effective Date", value: "2026-09-06" },
  { label: "Governing Law", value: "Delaware" },
  { label: "Jurisdiction", value: "courts located in New Castle, DE" },
];

async function stubCatalog(page: Page): Promise<void> {
  await page.route("**/api/documents", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CATALOG),
    })
  );
  await page.route("**/api/documents/mutual-nda", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(NDA_DETAIL),
    })
  );
}

async function stubChat(
  page: Page,
  reply: {
    reply: string;
    documentId: string | null;
    fields: { label: string; value: string }[];
    readyToDownload: boolean;
  }
): Promise<void> {
  // Drop any previous stub so the newest is authoritative (routes are LIFO).
  await page.unroute("**/api/chat");
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reply),
    })
  );
}

async function send(page: Page, text: string, expectReply: string): Promise<void> {
  await page.getByLabel("Message the assistant").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(expectReply)).toBeVisible();
}

test.describe("Legal Agreement Creator", () => {
  test("picks a document via chat, fills it in, previews it, and downloads a real PDF", async ({
    page,
  }) => {
    await stubCatalog(page);
    await signUp(page);

    // The opener lists the available agreements.
    await expect(page.getByText(/Cloud Service Agreement/)).toBeVisible();

    await stubChat(page, {
      reply: "Sure — what's the purpose of the NDA?",
      documentId: "mutual-nda",
      fields: [],
      readyToDownload: false,
    });
    await send(page, "I need a mutual NDA", "what's the purpose of the NDA?");

    // The chosen template renders, with an unfilled blank.
    await expect(
      page.getByText("Common Paper mutual NDA standard terms.")
    ).toBeVisible();
    await expect(page.getByText("[Effective Date]")).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download PDF" });
    await expect(downloadButton).toBeDisabled();

    await stubChat(page, {
      reply: "All set — you can download it now.",
      documentId: "mutual-nda",
      fields: CORE_FIELDS,
      readyToDownload: true,
    });
    await send(page, "here are the details", "you can download it now.");

    await expect(page.getByText("[Effective Date]")).toHaveCount(0);
    // The value is substituted into the rendered template body.
    await expect(
      page.locator("mark.doc-fill", { hasText: "Delaware" })
    ).toBeVisible();
    await expect(downloadButton).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      "Mutual-Non-Disclosure-Agreement.pdf"
    );
    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = await readFile(path as string);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(5_000);
  });

  test("keeps the download button disabled until the chat fills the core fields", async ({
    page,
  }) => {
    await stubCatalog(page);
    await signUp(page);

    const downloadButton = page.getByRole("button", { name: "Download PDF" });
    await expect(downloadButton).toBeDisabled();

    await stubChat(page, {
      reply: "Got it, a mutual NDA. What's the purpose?",
      documentId: "mutual-nda",
      fields: [],
      readyToDownload: false,
    });
    await send(page, "a mutual NDA", "What's the purpose?");
    await expect(
      page.getByText("Common Paper mutual NDA standard terms.")
    ).toBeVisible();
    await expect(downloadButton).toBeDisabled();

    await stubChat(page, {
      reply: "Great, that's everything I need.",
      documentId: "mutual-nda",
      fields: CORE_FIELDS,
      readyToDownload: true,
    });
    await send(page, "the rest of the details", "that's everything I need.");
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
