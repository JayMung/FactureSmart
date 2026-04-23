const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Control Center - Form Submission\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  // Step 1: Login
  console.log('🔐 Step 1: Logging in...');
  await page.goto('https://solution-api.buckydrop.com/en/login');
  await page.waitForSelector('#accountName', { timeout: 10000 }).catch(() => null);
  
  if (await page.$('#accountName')) {
    await page.type('#accountName', 'mungedijeancy@gmail.com');
    await page.type('#password', 'Mungedi@361993');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 }).catch(() => null);
    console.log('✅ Logged in successfully');
  } else {
    console.log('⚠️ Already logged in or different login form');
  }
  
  // Step 2: Navigate to Control Center
  console.log('\n🔧 Step 2: Navigating to Control Center...');
  await page.goto('https://solution-api.buckydrop.com/en/control', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  // Take screenshot
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-control-center.png', fullPage: true });
  console.log('📸 Screenshot saved: buckydrop-control-center.png');
  
  // Check current page content
  const pageContent = await page.evaluate(() => ({
    url: page.url(),
    title: document.title,
    bodyText: document.body?.innerText?.substring(0, 500)
  }));
  
  console.log('\n📄 Current Page:');
  console.log('   URL:', pageContent.url);
  console.log('   Title:', pageContent.title);
  console.log('   Content preview:', pageContent.bodyText?.substring(0, 200));
  
  // Try to find form elements
  console.log('\n🔍 Looking for form elements...');
  
  const formSelectors = [
    'input[name*="name"]', 'input[id*="name"]',
    'input[name*="email"]', 'input[id*="email"]',
    'input[name*="phone"]', 'input[id*="phone"]',
    'textarea', 'select',
    'button[type="submit"]'
  ];
  
  for (const selector of formSelectors) {
    const elements = await page.$$(selector);
    if (elements.length > 0) {
      console.log(`   Found ${elements.length} elements matching: ${selector}`);
    }
  }
  
  await browser.close();
  console.log('\n🎉 Browser session closed!');
})();