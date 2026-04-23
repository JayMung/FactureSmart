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
    // Try Ekoru
    await page.goto('https://www.ekoru.org/search?q=transport+company+Lubumbashi+site:.cd', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('.result, .search-result, li');
      return Array.from(items).slice(0,15).map(item => {
        const a = item.querySelector('a');
        const title = item.querySelector('h2, h3, .title');
        const desc = item.querySelector('p, .description');
        return { 
          title: title?.textContent?.trim(), 
          url: a?.href,
          desc: desc?.textContent?.trim()
        };
      }).filter(r => r.url && r.title && r.title.length > 5);
    });
    
    console.log('Results:', results.length);
    results.forEach((r,i) => console.log(i+1 + '.', r.title?.substring(0,60), '|', r.url));
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
}

scrape().catch(console.error);
