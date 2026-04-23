const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Control Center - Form Submission\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  try {
    // Step 1: Login first
    console.log('🔐 Step 1: Logging in...');
    await page.goto('https://solution-api.buckydrop.com/en/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if login form exists
    const accountNameInput = await page.$('#accountName');
    const passwordInput = await page.$('#password');
    
    if (accountNameInput && passwordInput) {
      console.log('   Found login form, entering credentials...');
      await page.type('#accountName', 'mungedijeancy@gmail.com');
      await page.type('#password', 'Mungedi@361993');
      
      // Find and click submit button
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('   Clicked submit button...');
      }
      
      // Wait for navigation
      await page.waitForNavigation({ timeout: 30000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 5000));
      console.log('✅ Login completed');
    } else {
      console.log('   Already logged in or different page');
    }
    
    // Step 2: Navigate to Control Center
    console.log('\n🔧 Step 2: Going to Control Center...');
    await page.goto('https://solution-api.buckydrop.com/en/control', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Save screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-control-dashboard.png', fullPage: true });
    console.log('📸 Screenshot saved\n');
    
    // Get page info
    console.log('📄 Page Info:');
    console.log('   URL:', page.url());
    console.log('   Title:', await page.title());
    
    // Get visible text content
    const bodyText = await page.evaluate(() => document.body?.innerText || 'No content');
    
    console.log('\n🔍 Looking for form elements...');
    
    const inputs = await page.$$('input');
    const textareas = await page.$$('textarea');
    const buttons = await page.$$('button');
    const selects = await page.$$('select');
    
    console.log(`   Inputs: ${inputs.length}`);
    console.log(`   Textareas: ${textareas.length}`);
    console.log(`   Buttons: ${buttons.length}`);
    console.log(`   Selects: ${selects.length}`);
    
    // Look for specific sections
    console.log('\n🔑 Looking for Credentials/Qualification section...');
    
    const pageText = bodyText.toLowerCase();
    const sections = [
      { name: 'Credentials', keywords: ['credential', 'qualification'] },
      { name: 'Platform Intro', keywords: ['platform', 'intro', 'description'] },
      { name: 'API Selection', keywords: ['api', 'required', 'select'] },
      { name: 'Submit', keywords: ['submit', 'review', 'apply'] }
    ];
    
    for (const section of sections) {
      const found = section.keywords.some(kw => pageText.includes(kw));
      console.log(`   ${found ? '✅' : '❌'} ${section.name}`);
    }
    
    // Show some content preview
    console.log('\n📝 Content Preview:');
    console.log('─'.repeat(50));
    console.log(bodyText.substring(0, 1000));
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Session completed!');
})();