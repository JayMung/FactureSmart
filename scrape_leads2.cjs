const { chromium } = require('playwright-core');

async function scrape() {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({ 
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    // Try Yes tats a privacy search that might work
    await page.goto('https://yesdat.com/search?q=transport+Lubumbashi+DRC', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('.web-results .result, .search-result');
      return Array.from(items).slice(0,15).map(item => {
        const a = item.querySelector('a');
        const title = item.querySelector('h3');
        return { title: title?.textContent?.trim(), url: a?.href };
      }).filter(r => r.url && r.title);
    });
    
    console.log('Yesdat results:', results.length);
    results.forEach((r,i) => console.log(i+1 + '.', r.title?.substring(0,60), '|', r.url));
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
}

scrape().catch(console.error);
