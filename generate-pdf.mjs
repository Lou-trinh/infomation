import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'index.html');
const pdfPath  = path.join(__dirname, 'cv-trinh-tuan-cuong.pdf');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-background-networking'],
});
const page    = await browser.newPage();

// Skip remote font requests so generation also works while offline.
await page.setRequestInterception(true);
page.on('request', request => {
  if (/^https?:/i.test(request.url())) request.abort();
  else request.continue();
});

// tắt animation trước khi load
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
  waitUntil: 'domcontentloaded',
  timeout: 5000,
}).catch(() => {});

// chờ font Google Fonts load xong
await new Promise(r => setTimeout(r, 1500));

// set lang = EN (mặc định)
await page.evaluate(() => setLang('en'));

// emulate print để CSS @media print áp dụng trước khi đo
await page.emulateMediaType('print');
await new Promise(r => setTimeout(r, 200));

const { w, h } = await page.evaluate(() => {
  const rect = document.querySelector('.cv').getBoundingClientRect();
  return { w: Math.ceil(rect.width), h: Math.ceil(rect.height) };
});

await page.pdf({
  path: pdfPath,
  width: `${w}px`,
  height: `${h}px`,
  waitForFonts: false,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

await browser.close();
console.log('✅ PDF saved:', pdfPath);
