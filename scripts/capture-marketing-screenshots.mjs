import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/marketing/screenshots');
const baseUrl = 'https://www.familyphotohunt.com';

const pages = [
  { name: '01-home', path: '/', waitFor: 'text=Photo Hunt' },
  { name: '02-login', path: '/login', waitFor: 'text=Log in' },
  { name: '03-help-home', path: '/help', waitFor: 'text=Help' },
  { name: '04-help-admin', path: '/help/admin', waitFor: 'text=Organizer' },
  { name: '05-help-participants', path: '/help/participants', waitFor: 'text=Participant' },
];

async function capture(viewport, suffix) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices[viewport],
    locale: 'en-US',
  });
  const page = await context.newPage();

  for (const entry of pages) {
    const url = `${baseUrl}${entry.path}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    try {
      await page.getByText(entry.waitFor, { exact: false }).first().waitFor({ timeout: 15000 });
    } catch {
      // Best effort — still capture whatever rendered.
    }
    await page.waitForTimeout(800);
    const file = path.join(outDir, `${entry.name}-${suffix}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('Saved', file);
  }

  await browser.close();
}

await mkdir(outDir, { recursive: true });
await capture('Desktop Chrome', 'desktop');
await capture('iPhone 13', 'mobile');
