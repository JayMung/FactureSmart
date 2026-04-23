const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Shipping Records Exploration\n');
  
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

  // Wait for dashboard
  await new Promise(r => setTimeout(r, 3000));

  // Try different URL patterns for Shipping Records
  const shippingUrls = [
    '/en/admin/shipping/',
    '/en/admin/shipping/records/',
    '/en/admin/orders/',
    '/en/admin/stocking/',
    '/en/admin/stocking/records/',
    '/en/admin/shipping/manage/',
  ];

  console.log('🔍 Recherche Shipping Records...\n');

  for (const url of shippingUrls) {
    try {
      const fullUrl = 'https://www.buckydrop.com' + url;
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 2000));
      const title = await page.title();

      console.log(`📄 ${url}`);
      console.log(`   Title: ${title}`);
      console.log(`   Preview: ${pageText.substring(0, 300)}...\n`);
      
    } catch (e) {
      console.log(`${url} -> Erreur: ${e.message.substring(0, 50)}\n`);
    }
  }

  // Look for shipping-related menu items
  console.log('🖱️ Recherche menu Shipping...');
  const allLinks = await page.$$eval('a', links => 
    links.map(l => ({
      text: l.innerText?.trim().substring(0, 50),
      href: l.href
    })).filter(l => l.text && (
      l.text.toLowerCase().includes('ship') ||
      l.text.toLowerCase().includes('shipping') ||
      l.text.toLowerCase().includes('record') ||
      l.text.toLowerCase().includes('transit') ||
      l.text.toLowerCase().includes('colis') ||
      l.text.toLowerCase().includes('package') ||
      l.text.toLowerCase().includes('delivery')
    ))
  );

  console.log('Liens Shipping trouvés:', allLinks);

  // Take screenshot of the page
  await page.goto('https://www.buckydrop.com/en/admin/orders/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-orders.png', fullPage: true });
  console.log('\n📸 Screenshot Orders: buckydrop-orders.png');

  await browser.close();
  console.log('\n🎉 Terminé !');
})();