const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Lancement Buckydrop...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Login
  console.log('🔐 Connexion à Buckydrop...');
  await page.goto('https://www.buckydrop.com/en/login/');
  await page.waitForSelector('#accountName');
  await page.type('#accountName', 'mungedijeancy@gmail.com');
  await page.type('#password', 'Mungedi@361993');
  await page.click('button[type="submit"]');
  
  // Wait for login
  await page.waitForNavigation({ timeout: 30000 });
  console.log('✅ Connecté !');
  
  // Check dashboard
  const title = await page.title();
  console.log('📄 Page:', title);
  
  // Look for API/Webhooks settings
  console.log('🔍 Recherche paramètres API/Webhooks...');
  
  await browser.close();
  console.log('🎉 Test terminé !');
})();
