const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Deep Exploration\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Login first
  console.log('🔐 Connexion...');
  await page.goto('https://www.buckydrop.com/en/login/');
  await page.waitForSelector('#accountName');
  await page.type('#accountName', 'mungedijeancy@gmail.com');
  await page.type('#password', 'Mungedi@361993');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 30000 });
  console.log('✅ Connecté !\n');

  // Wait for dashboard to load
  await new Promise(r => setTimeout(r, 3000));

  // 1. Look for Settings in the menu
  console.log('🎯 Recherche Settings dans le menu...');
  
  // Find all menu items with "Settings" or "Paramètres"
  const settingsLinks = await page.$$eval('a', links => 
    links.map(l => ({ 
      text: l.innerText?.trim().substring(0, 100), 
      href: l.href 
    })).filter(l => l.text && (
      l.text.toLowerCase().includes('setting') ||
      l.text.toLowerCase().includes('paramètre') ||
      l.text.toLowerCase().includes('api') ||
      l.text.toLowerCase().includes('webhook') ||
      l.text.toLowerCase().includes('integration') ||
      l.text.toLowerCase().includes('developer') ||
      l.text.toLowerCase().includes('store') ||
      l.text.toLowerCase().includes('shop')
    ))
  );
  
  console.log('Links found:', settingsLinks);

  // 2. Try clicking on menu items
  console.log('\n🖱️ Test des menus...');
  
  const menuSelectors = [
    { name: 'Services', selector: 'text=Services' },
    { name: 'Store', selector: 'text=Store' },
    { name: 'Sourcing', selector: 'text=Sourcing' },
    { name: 'Orders', selector: 'text=Orders' },
  ];

  for (const menu of menuSelectors) {
    try {
      await page.goto('https://www.buckydrop.com/en/admin/home', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));
      
      // Click on menu item
      await page.click(`a:has-text("${menu.name}")`, { timeout: 5000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
      
      const url = page.url();
      const title = await page.title();
      console.log(`  ${menu.name}: ${url} - ${title}`);
      
    } catch (e) {
      console.log(`  ${menu.name}: Erreur - ${e.message.substring(0, 50)}`);
    }
  }

  // 3. Look for iframes or embedded content
  console.log('\n🔍 Recherche iframes/API...');
  const iframes = await page.$$eval('iframe', iframes => 
    iframes.map(f => ({
      src: f.src,
      name: f.name
    }))
  );
  console.log('Iframes:', iframes);

  // 4. Look for API keys or webhook URLs in page source
  console.log('\n🔑 Recherche API keys/Webhook URLs dans le DOM...');
  const apiPatterns = await page.evaluate(() => {
    const patterns = [];
    // Look for api_key, apikey, token, webhook in scripts and attributes
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
      if (s.src && s.src.includes('api')) {
        patterns.push({ type: 'script', src: s.src });
      }
    });
    return patterns;
  });
  console.log('API patterns:', apiPatterns.slice(0, 5));

  // 5. Take a screenshot of current state
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-full.png', fullPage: true });
  console.log('\n📸 Screenshot complet sauvegardé: buckydrop-full.png');

  await browser.close();
  console.log('\n🎉 Exploration terminée !');
})();
