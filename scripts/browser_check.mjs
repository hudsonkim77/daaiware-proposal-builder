import { chromium } from "playwright";
import { preview } from "vite";
import assert from "node:assert";

const server = await preview({ preview: { port: 4321, host: "127.0.0.1" } });
const url = "http://127.0.0.1:4321";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("#topic-select");

const optionCount = await page.locator("#topic-select option").count();
assert.strictEqual(optionCount, 16, `expected 16 options (1 placeholder + 15 topics), got ${optionCount}`);
console.log("option count OK:", optionCount);

// select the first real topic
await page.selectOption("#topic-select", "0");
await page.waitForSelector("#detail h2");
const summaryText = await page.locator("#detail p").first().innerText();
assert.ok(summaryText.length > 0, "summary text should be non-empty");
console.log("summary text OK:", summaryText.slice(0, 60));

const sectionCount = await page.locator(".section-card").count();
assert.ok(sectionCount >= 4, `expected >=4 sections, got ${sectionCount}`);
console.log("section count OK:", sectionCount);

// self-check should show issues since risk/ask are empty
let selfcheck = await page.locator("#selfcheck").innerText();
assert.ok(selfcheck.includes("결정을 요구하는 동사"), "expected missing-verb warning before filling ask field");
console.log("self-check shows expected warning before filling fields");

await page.fill("#risk", "테스트 위험 문구입니다.");
await page.fill("#ask", "승인해 주십시오.");
await page.waitForTimeout(100);
selfcheck = await page.locator("#selfcheck").innerText();
assert.ok(selfcheck.includes("모두 통과"), `expected all-clear after filling fields, got: ${selfcheck}`);
console.log("self-check clean after filling fields");

// verify an SVG chart actually rendered
const svgCount = await page.locator(".section-card svg").count();
assert.ok(svgCount >= 1, "expected at least one chart SVG rendered");
console.log("chart SVG rendered:", svgCount);

// download button produces a file
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click("#download"),
]);
const suggested = download.suggestedFilename();
assert.strictEqual(suggested, "제안서.html");
console.log("download OK:", suggested);

// switch topics: pick a rejected (기각) one and confirm warning shows, no crash
const optionsText = await page.locator("#topic-select option").allTextContents();
const rejectedIndex = optionsText.findIndex((t) => t.includes("차이 없음"));
assert.ok(rejectedIndex > 0, "expected at least one rejected topic in dropdown");
await page.selectOption("#topic-select", String(rejectedIndex - 1));
await page.waitForSelector("#detail h2");
const warnText = await page.locator("#detail .warn").first().innerText();
assert.ok(warnText.includes("기각"), `expected rejection warning, got: ${warnText}`);
console.log("rejected-topic path OK");

// "9주차 적용 포인트" modal opens and closes
const modal = page.locator("#week9-modal");
assert.strictEqual(await modal.isVisible(), false, "modal should be closed initially");
await page.click("#week9-btn");
await page.waitForTimeout(50);
assert.strictEqual(await modal.isVisible(), true, "modal should open after clicking button");
const modalText = await modal.locator(".modal-body").innerText();
assert.ok(modalText.includes("Day3"), "modal should mention Day3");
console.log("9주차 modal opens with expected content");
await page.click("#week9-close");
await page.waitForTimeout(50);
assert.strictEqual(await modal.isVisible(), false, "modal should close after clicking X");
console.log("9주차 modal closes via X button");

assert.strictEqual(errors.length, 0, `console/page errors found: ${JSON.stringify(errors)}`);
console.log("NO CONSOLE/PAGE ERRORS");

await browser.close();
await server.httpServer.close();
console.log("\nALL BROWSER CHECKS PASSED");
