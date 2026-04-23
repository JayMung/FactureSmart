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
    
    // Check current URL and content
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check for username in body
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasUsername = bodyText.includes('Jeancy') || bodyText.includes('Mungedi');
    console.log(`   Has username: ${hasUsername}`);
    
    // Step 2: Navigate to Solution API
    console.log('\n🔧 Step 2: Navigate to Solution API...');
    await page.goto('https://solution-api.buckydrop.com/en/control', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Save screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-solution-final.png', fullPage: true });
    console.log('📸 Screenshot saved\n');
    
    // Get page content
    const solutionUrl = page.url();
    const solutionTitle = await page.title();
    const solutionText = await page.evaluate(() => document.body.innerText);
    
    console.log('📄 Solution API Page:');
    console.log(`   URL: ${solutionUrl}`);
    console.log(`   Title: ${solutionTitle}`);
    
    // Look for form elements
    const inputs = await page.$$('input');
    const textareas = await page.$$('textarea');
    const buttons = await page.$$('button');
    
    console.log('\n🎯 Form elements:');
    console.log(`   Inputs: ${inputs.length}`);
    console.log(`   Textareas: ${textareas.length}`);
    console.log(`   Buttons: ${buttons.length}`);
    
    // Check for specific content
    console.log('\n✅ Content checks:');
    const checks = [
      { name: 'Credentials', found: solutionText.toLowerCase().includes('credential') },
      { name: 'Qualification', found: solutionText.toLowerCase().includes('qualification') },
      { name: 'Platform', found: solutionText.toLowerCase().includes('platform') },
      { name: 'Submit', found: solutionText.toLowerCase().includes('submit') },
      { name: 'Approved', found: solutionText.toLowerCase().includes('approved') },
      { name: 'Sign In', found: solutionText.toLowerCase().includes('sign in') }
    ];
    
    checks.forEach(check => {
      console.log(`   ${check.found ? '✅' : '❌'} ${check.name}`);
    });
    
    // Show content preview
    console.log('\n📝 Content Preview:');
    console.log('─'.repeat(50));
    console.log(solutionText.substring(0, 1500));
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();