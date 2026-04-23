const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Quick Exploration\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Login
  console.log('🔐 Connexion...');
  await page.goto('https://www.buckydrop.com/en/login/');
  await page.waitForSelector('#accountName');
  await page.type('#accountName', 'mungedijeancy@gmail.com');
  await page.type('#password', 'Mungedi@361993');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 30000 });
  console.log('✅ Connecté !\n');

  // Navigate to admin sections
  const adminUrls = [
    '/en/admin/home/',
    '/en/admin/services/',
    '/en/admin/orders/',
    '/en/admin/sourcing/',
    '/en/admin/stocking/',
    '/en/admin/store/',
    '/en/admin/settings/',
  ];

  console.log('🌐 Exploration des sections admin:\n');
  
  for (const adminPath of adminUrls) {
    try {
      const fullUrl = 'https://www.buckydrop.com' + adminPath;
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));
      
      const title = await page.title();
      const currentUrl = page.url();
      
      console.log(`${currentUrl}`);
      console.log(`   Title: ${title}`);
      
      // Look for API/Webhook related text
      const pageText = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
      if (pageText.includes('api') || pageText.includes('webhook') || pageText.includes('integration') || pageText.includes('key')) {
        console.log('   ⚠️  Contient références API/Webhooks !');
      }
      console.log('');
      
    } catch (e) {
      console.log(`${url} -> Erreur: ${e.message.substring(0, 50)}\n`);
    }
  }

  // Take final screenshot
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-admin.png', fullPage: true });
  console.log('📸 Screenshot admin: buckydrop-admin.png');

  await browser.close();
  console.log('\n🎉 Terminé !');
})();
