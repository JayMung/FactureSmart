/**
 * Buckydrop - Test Cookie Persistence (NO re-login)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const COOKIES_FILE = path.join(__dirname, '.buckydrop-cookies.json');
const CHROMIUM_PATH = '/usr/bin/chromium-browser';

const SOLUTION_API = 'https://solution-api.buckydrop.com/en/control';

(async () => {
  console.log('🚀 Buckydrop - Test Cookie Persistence\n');
  
  if (!fs.existsSync(COOKIES_FILE)) {
    console.log('❌ No cookies file found!');
    console.log('   Run buckydrop-full-flow.cjs first to create cookies');
    process.exit(1);
  }
  
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  try {
    // Load cookies from file
    console.log('📂 Loading cookies from:', COOKIES_FILE);
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    await page.setCookie(...cookies);
    console.log('✅ Cookies loaded:', cookies.length, 'cookies\n');
    
    // Go directly to Solution API
    console.log('🔗 Navigating to Solution API (NO login needed)...');
    await page.goto(SOLUTION_API, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Check result
    const finalUrl = page.url();
    const finalTitle = await page.title();
    const finalText = await page.evaluate(() => document.body.innerText);
    
    console.log('📊 RESULT:');
    console.log('   URL:', finalUrl);
    console.log('   Title:', finalTitle);
    console.log('   Has Credentials:', finalText.toLowerCase().includes('credential') ? '✅' : '❌');
    console.log('   Has Submit:', finalText.toLowerCase().includes('submit') ? '✅' : '❌');
    console.log('   Has Platform Intro:', finalText.toLowerCase().includes('platform') ? '✅' : '❌');
    
    // Screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-cookies-test.png', fullPage: true });
    console.log('\n📸 Screenshot: /home/jay/FactureX/buckydrop-cookies-test.png');
    
    // Content preview
    console.log('\n📄 Content Preview:');
    console.log('─'.repeat(50));
    console.log(finalText.substring(0, 1200));
    console.log('─'.repeat(50));
    
    // Success check
    if (finalText.toLowerCase().includes('submit')) {
      console.log('\n🎉 SUCCESS! Cookies working - NO re-login needed!');
    } else {
      console.log('\n⚠️ Cookies NOT working - redirected to login');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();