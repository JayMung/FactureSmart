const { chromium } = require('playwright-core');

async function scrape() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to Google...');
    await page.goto('https://www.google.com/search?q=transport+company+Lubumbashi+site:.cd', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('div.g');
      return Array.from(items).slice(0, 10).map(item => {
        const link = item.querySelector('a[href]');
        const title = item.querySelector('h3');
        return {
          title: title?.textContent?.trim() || '',
          url: link?.href || ''
        };
      }).filter(r => r.url && r.title);
    });
    
    console.log('Found', results.length, 'results');
    console.log(JSON.stringify(results, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
}

scrape().catch(console.error);
