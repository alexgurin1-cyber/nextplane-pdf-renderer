// NextPlane PDF renderer — renders a URL to PDF with headless Chrome.
// POST /render  { "url": "https://nextplane.us/report-print/N12345?token=..." }
// Header: x-render-key: <RENDER_KEY>
// Response: application/pdf bytes
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json({ limit: "1mb" }));

const RENDER_KEY = process.env.RENDER_KEY;
const ALLOWED_HOST = "nextplane.us"; // only render our own site

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
    });
  }
  return browserPromise;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/render", async (req, res) => {
  if (!RENDER_KEY || req.headers["x-render-key"] !== RENDER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { url } = req.body || {};
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: "bad url" }); }
  if (parsed.hostname !== ALLOWED_HOST && !parsed.hostname.endsWith("." + ALLOWED_HOST)) {
    return res.status(400).json({ error: "host not allowed" });
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    // Wait for the page's readiness signal (charts + map painted); page sets a 20s hard fallback itself
    await page.waitForFunction("window.__printReady === true", { timeout: 30000 }).catch(() => {});
    // small settle delay for final paints
    await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
    // Signal print CSS
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" }, // page adds its own dark-theme padding
      displayHeaderFooter: false,
      timeout: 60000,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error("render failed:", err.message);
    res.status(500).json({ error: String(err.message).slice(0, 300) });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`pdf-renderer listening on :${port}`));
