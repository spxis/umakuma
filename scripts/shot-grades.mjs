/** Grades list view at two widths, to check the reading rows fit. */
import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")).trim(),
      line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
    ]),
);

const out = process.argv[2] ?? "/tmp";
const token = await encode({
  token: { name: "Shot", email: (env.ADMIN_GOOGLE_ALLOWED_EMAILS ?? "").split(",")[0]?.trim(), sub: "shot" },
  secret: env.AUTH_SECRET ?? env.NEXTAUTH_SECRET,
});

const browser = await chromium.launch();
for (const [label, width] of [["narrow", 393], ["mid", 650], ["wide", 1440]]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addCookies([
    { name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  await context.addInitScript(() => {
    window.localStorage.setItem("wr:grades:view-mode", "list");
  });
  const page = await context.newPage();
  await page.goto("http://localhost:6400/users/johnmorrisdotca/grades", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForTimeout(1200);

  /* The bug is horizontal overflow, so measure it rather than only look. */
  const overflow = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("li"));
    let worst = 0;
    for (const row of rows) {
      for (const child of Array.from(row.querySelectorAll("*"))) {
        worst = Math.max(worst, child.getBoundingClientRect().right - row.getBoundingClientRect().right);
      }
    }
    return { worst: Math.round(worst), bodyScroll: document.body.scrollWidth - document.body.clientWidth };
  });
  console.log(label, width, JSON.stringify(overflow));
  await page.screenshot({ path: `${out}/grades-${label}.png` });
  await context.close();
}
await browser.close();
