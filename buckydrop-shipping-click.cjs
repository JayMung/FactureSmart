const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Shipping Records - Click Method\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  // Login
  console.log('🔐 Connexion Buckydrop...');
  await page.goto('https://www.buckydrop.com/en/login/');
  await page.waitForSelector('#accountName');
  await page.type('#accountName', 'mungedijeancy@gmail.com');
  await page.type('#password', 'Mungedi@361993');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 30000 });
  console.log('✅ Connecté !\n');

  // Go to Orders
  console.log('📦 Navigation vers Orders...');
  await page.goto('https://www.buckydrop.com/en/admin/orders/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  // Take screenshot of Orders page
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-orders-page.png', fullPage: true });
  console.log('📸 Screenshot Orders: buckydrop-orders-page.png\n');

  // Look for Shipping Records link/button
  console.log('🔍 Recherche "Shipping Records" dans la page...');
  
  // Try multiple selectors for Shipping Records
  const selectors = [
    'a:has-text("Shipping Records")',
    'text=Shipping Records',
    '*:has-text("Shipping Records")',
    '[href*="shipping"]',
    'span:has-text("Shipping Records")',
    'div:has-text("Shipping Records")'
  ];

  for (const selector of selectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`✅ Trouvé: ${selector} (${elements.length} éléments)`);
        
        // Click on the first one
        await page.click(selector, { timeout: 5000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));
        
        // Check if URL changed
        const currentUrl = page.url();
        console.log(`   Nouvelle URL: ${currentUrl}`);
        
        break;
      }
    } catch (e) {
      // Continue
    }
  }

  // If still on Orders page, try clicking using evaluate
  console.log('\n🖱️ Tentative de clic via JavaScript...');
  
  const clicked = await page.evaluate(() => {
    // Find all links with "Shipping Records" text
    const links = Array.from(document.querySelectorAll('a, button, span, div'));
    const target = links.find(el => 
      el.innerText && el.innerText.includes('Shipping Records')
    );
    
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  
  if (clicked) {
    console.log('✅ Clic exécuté via JavaScript');
    await new Promise(r => setTimeout(r, 3000));
  }

  // Take screenshot of current page
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-shipping-click.png', fullPage: true });
  console.log('📸 Screenshot: buckydrop-shipping-click.png\n');

  // Get current URL and page content
  const finalUrl = page.url();
  const pageTitle = await page.title();
  const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 3000));

  console.log(`📄 URL finale: ${finalUrl}`);
  console.log(`   Title: ${pageTitle}`);
  console.log(`   Content preview:`);
  console.log(pageText.substring(0, 500));

  await browser.close();
  console.log('\n🎉 Terminé !');
})();