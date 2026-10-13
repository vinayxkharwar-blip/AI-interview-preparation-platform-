const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('Logging in and navigating to profile...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  } catch (e) {
    console.log('Login fallback: register new user');
    await page.goto('http://localhost:3000/register');
    await page.fill('input[placeholder*="name" i]', 'test7');
    await page.fill('input[type="email"]', `test7_${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  await page.goto('http://localhost:3000/profile');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(__dirname, 'profile_desktop.png'), fullPage: true });

  const layoutInfo = await page.evaluate(() => {
    const mainEl = document.querySelector('main');
    const pageContainer = document.querySelector('.max-w-7xl') || document.body;
    const gridEl = document.querySelector('.grid.grid-cols-1');
    const cols = Array.from(gridEl ? gridEl.children : []).map(c => ({
      tag: c.tagName,
      className: c.className,
      rect: c.getBoundingClientRect()
    }));

    return {
      windowWidth: window.innerWidth,
      bodyWidth: document.body.offsetWidth,
      gridRect: gridEl ? gridEl.getBoundingClientRect() : null,
      cols
    };
  });

  console.log('Layout info:', JSON.stringify(layoutInfo, null, 2));
  await browser.close();
})();
