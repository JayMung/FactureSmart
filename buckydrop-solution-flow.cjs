const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Solution API - Full Login Flow\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  try {
    // Step 1: Login on main Buckydrop
    console.log('🔐 Step 1: Login to main Buckydrop...');
    await page.goto('https://www.buckydrop.com/en/login/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    if (await page.$('#accountName')) {
      await page.type('#accountName', 'mungedijeancy@gmail.com');
      await page.type('#password', 'Mungedi@361993');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ timeout: 30000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 3000));
      console.log('✅ Logged in to Buckydrop main site');
    }
    
    // Check if we're logged in (look for username in header)
    const pageContent = await page.evaluate(() => ({
      url: page.url(),
      hasUsername: document.body.innerText.includes('Jeancy') || document.body.innerText.includes('Mungedi'),
      title: document.title
    }));
    
    console.log(`   URL: ${pageContent.url}`);
    console.log(`   Has username: ${pageContent.hasUsername}`);
    
    // Step 2: Navigate to Solution API
    console.log('\n🔧 Step 2: Navigate to Solution API...');
    await page.goto('https://solution-api.buckydrop.com/en/control', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Save screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-solution-api.png', fullPage: true });
    console.log('📸 Screenshot saved\n');
    
    // Check current state
    const solutionContent = await page.evaluate(() => ({
      url: page.url(),
      title: document.title,
      bodyText: (document.body?.innerText || '').substring(0, 2000)
    }));
    
    console.log('📄 Solution API Page:');
    console.log(`   URL: ${solutionContent.url}`);
    console.log(`   Title: ${solutionContent.title}`);
    console.log(`   Content preview:`);
    console.log('─'.repeat(50));
    console.log(solutionContent.bodyText.substring(0, 1000));
    console.log('─'.repeat(50));
    
    // Look for form elements
    console.log('\n🎯 Looking for form elements...');
    const inputs = await page.$$('input');
    const textareas = await page.$$('textarea');
    const buttons = await page.$$('button');
    
    console.log(`   Inputs: ${inputs.length}`);
    console.log(`   Textareas: ${textareas.length}`);
    console.log(`   Buttons: ${buttons.length}`);
    
    // Check for specific BuckyDrop Solution elements
    const content = solutionContent.bodyText.toLowerCase();
    const checks = [
      { name: 'Credentials', keyword: 'credential' },
      { name: 'Qualification', keyword: 'qualification' },
      { name: 'Platform Intro', keyword: 'platform' },
      { name: 'API', keyword: 'api' },
      { name: 'Submit', keyword: 'submit' },
      { name: 'Approved', keyword: 'approved' }
    ];
    
    console.log('\n✅ Section checks:');
    checks.forEach(check => {
      const found = content.includes(check.keyword);
      console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();