import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.describe("Mutual NDA Creator", () => {
  test("fills the form, live-previews the NDA, and downloads a real PDF", async ({
    page,
  }) => {
    await page.goto("/");

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
    await page.goto("/");

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
