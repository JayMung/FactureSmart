const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Control Center\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  try {
    // Navigate directly to Control Center (assume logged in)
    console.log('🔧 Navigating to Control Center...');
    await page.goto('https://solution-api.buckydrop.com/en/control', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Save screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-control-full.png', fullPage: true });
    console.log('📸 Screenshot saved\n');
    
    // Get page info
    console.log('📄 Page Info:');
    console.log('   URL:', page.url());
    console.log('   Title:', await page.title());
    
    // Get visible text content
    const bodyText = await page.evaluate(() => document.body?.innerText || 'No content');
    console.log('\n🔍 Page Content Preview:');
    console.log('─'.repeat(50));
    console.log(bodyText.substring(0, 1500));
    console.log('─'.repeat(50));
    
    // Look for form fields
    console.log('\n🎯 Looking for form elements...');
    
    const inputs = await page.$$('input');
    const textareas = await page.$$('textarea');
    const buttons = await page.$$('button');
    const forms = await page.$$('form');
    
    console.log(`   Inputs: ${inputs.length}`);
    console.log(`   Textareas: ${textareas.length}`);
    console.log(`   Buttons: ${buttons.length}`);
    console.log(`   Forms: ${forms.length}`);
    
    // Try to find the credentials form
    console.log('\n🔑 Looking for Credentials section...');
    
    const pageText = bodyText.toLowerCase();
    if (pageText.includes('credential') || pageText.includes('qualification')) {
      console.log('   ✅ Found Credentials/Qualification section');
    }
    if (pageText.includes('platform') || pageText.includes('intro')) {
      console.log('   ✅ Found Platform section');
    }
    if (pageText.includes('submit') || pageText.includes('review')) {
      console.log('   ✅ Found Submit button');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();