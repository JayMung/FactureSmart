/**
 * Buckydrop Browser Automation avec Cookie Persistence
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const COOKIES_FILE = path.join(__dirname, '.buckydrop-cookies.json');
const CHROMIUM_PATH = '/usr/bin/chromium-browser';

const BUCKYDROP_LOGIN = 'https://www.buckydrop.com/en/login/';
const BUCKYDROP_SOLUTION = 'https://solution-api.buckydrop.com/en/control';
const CREDENTIALS = {
  email: 'mungedijeancy@gmail.com',
  password: 'Mungedi@361993'
};

(async () => {
  console.log('🚀 Buckydrop Browser Automation - Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  try {
    // Load cookies if exist
    if (fs.existsSync(COOKIES_FILE)) {
      console.log('📂 Cookies found! Loading...');
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
      await page.setCookie(...cookies);
      console.log('✅ Cookies loaded\n');
    }
    
    // Navigate to Solution API
    console.log('🔗 Navigating to:', BUCKYDROP_SOLUTION);
    await page.goto(BUCKYDROP_SOLUTION, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const currentUrl = page.url();
    console.log('📄 Current URL:', currentUrl);
    
    // Check if logged in
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isLoggedIn = !bodyText.toLowerCase().includes('sign in') && 
                       !bodyText.toLowerCase().includes('log in');
    
    console.log('\n✅ Status Check:');
    console.log('   Logged In:', isLoggedIn ? '✅' : '❌');
    
    if (!isLoggedIn) {
      // Login
      console.log('\n🔐 Logging in...');
      await page.goto(BUCKYDROP_LOGIN, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
      
      const emailInput = await page.$('#accountName');
      const passwordInput = await page.$('#password');
      const submitBtn = await page.$('button[type="submit"]');
      
      if (emailInput && passwordInput) {
        await emailInput.type(CREDENTIALS.email);
        await passwordInput.type(CREDENTIALS.password);
        console.log('   Credentials filled');
        
        if (submitBtn) {
          await submitBtn.click();
          console.log('   Submit clicked');
          await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      // Save cookies
      const client = await page.target().createCDPSession();
      const cookies = await client.send('Network.getAllCookies');
      fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies.cookies, null, 2));
      console.log('💾 Cookies saved\n');
    }
    
    // Go to Solution API
    console.log('🔗 Navigating to Solution API...');
    await page.goto(BUCKYDROP_SOLUTION, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Final check
    const finalText = await page.evaluate(() => document.body.innerText);
    
    console.log('\n📊 FINAL RESULT:');
    console.log('   URL:', page.url());
    console.log('   Title:', await page.title());
    console.log('   Has Credentials:', finalText.toLowerCase().includes('credential') ? '✅' : '❌');
    console.log('   Has Submit:', finalText.toLowerCase().includes('submit') ? '✅' : '❌');
    console.log('   Has API:', finalText.toLowerCase().includes('api') ? '✅' : '❌');
    
    // Screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-browser-use-test.png', fullPage: true });
    console.log('\n📸 Screenshot: /home/jay/FactureX/buckydrop-browser-use-test.png');
    
    // Content preview
    console.log('\n📝 Content Preview:');
    console.log('─'.repeat(50));
    console.log(finalText.substring(0, 1000));
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();