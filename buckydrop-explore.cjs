const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Automation - Starting...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // 1. Login
  console.log('🔐 Connexion à Buckydrop...');
  await page.goto('https://www.buckydrop.com/en/login/');
  await page.waitForSelector('#accountName');
  await page.type('#accountName', 'mungedijeancy@gmail.com');
  await page.type('#password', 'Mungedi@361993');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 30000 });
  console.log('✅ Connecté !\n');

  // 2. Go to Dashboard
  console.log('📊 Navigation vers le dashboard...');
  await page.waitForSelector('body');
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-dashboard.png', fullPage: true });
  console.log('📸 Screenshot sauvegardé: buckydrop-dashboard.png\n');

  // 3. Look for API/Webhooks in menu
  console.log('🔍 Recherche paramètres API/Webhooks...');
  
  // Get all links and buttons
  const menuItems = await page.$$eval('a, button, span', els => 
    els.map(el => ({
      text: el.innerText?.trim().substring(0, 50),
      href: el.href,
      className: el.className
    })).filter(item => item.text && item.text.length > 2)
  );
  
  console.log('Menu items found:', menuItems.slice(0, 20));

  // 4. Try to find settings or API sections
  const settingsKeywords = ['api', 'webhook', 'setting', 'paramètre', 'integration', 'developer'];
  const relevantItems = menuItems.filter(item => 
    settingsKeywords.some(kw => item.text?.toLowerCase().includes(kw))
  );
  
  console.log('\n🔗 Liens pertinents (API/Webhooks):');
  if (relevantItems.length > 0) {
    relevantItems.forEach(item => {
      console.log(`  - ${item.text} -> ${item.href || 'no href'}`);
    });
  } else {
    console.log('  Aucun lien trouvé avec les mots-clés API/Webhooks');
  }

  // 5. Try to navigate to settings URL patterns
  const commonUrls = [
    '/en/settings/',
    '/en/developer/',
    '/en/api/',
    '/en/webhook/',
    '/settings/',
    '/developer/'
  ];

  console.log('\n🌐 Test des URLs de paramètres...');
  for (const url of commonUrls) {
    try {
      await page.goto('https://www.buckydrop.com' + url, { waitUntil: 'networkidle2', timeout: 10000 });
      const title = await page.title();
      console.log(`  ${url} -> ${title || 'OK'}`);
    } catch (e) {
      console.log(`  ${url} -> Page non accessible`);
    }
  }

  // 6. Get page content for analysis
  console.log('\n📄 Analyse du menu principal...');
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
  console.log(bodyText);

  await browser.close();
  console.log('\n🎉 Terminé !');
})();
