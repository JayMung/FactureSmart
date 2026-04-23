/**
 * Buckydrop Browser Automation - Full Login Flow
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const COOKIES_FILE = path.join(__dirname, '.buckydrop-cookies.json');
const CHROMIUM_PATH = '/usr/bin/chromium-browser';

const BUCKYDROP = 'https://www.buckydrop.com';
const BUCKYDROP_LOGIN = 'https://www.buckydrop.com/en/login/';
const SOLUTION_API = 'https://solution-api.buckydrop.com/en/control';
const CREDENTIALS = {
  email: 'mungedijeancy@gmail.com',
  password: 'Mungedi@361993'
};

(async () => {
  console.log('🚀 Buckydrop Full Login Flow\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  try {
    // Step 1: Login on main Buckydrop
    console.log('🔐 Step 1: Login to Buckydrop...');
    await page.goto(BUCKYDROP_LOGIN, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if already logged in
    let bodyText = await page.evaluate(() => document.body.innerText);
    let isLoggedIn = bodyText.includes('Jeancy') || bodyText.includes('Dashboard');
    
    if (!isLoggedIn) {
      console.log('   Filling login form...');
      await page.type('#accountName', CREDENTIALS.email);
      await page.type('#password', CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));
    }
    
    bodyText = await page.evaluate(() => document.body.innerText);
    isLoggedIn = bodyText.includes('Jeancy') || bodyText.includes('Dashboard');
    console.log('   Logged in:', isLoggedIn ? '✅' : '❌');
    
    // Save ALL cookies (from all domains)
    const client = await page.target().createCDPSession();
    const allCookies = await client.send('Network.getAllCookies');
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(allCookies.cookies, null, 2));
    console.log('💾 Cookies saved:', COOKIES_FILE, '\n');
    
    // Step 2: Navigate to Solution API
    console.log('🔗 Step 2: Navigate to Solution API...');
    await page.goto(SOLUTION_API, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Check result
    const finalUrl = page.url();
    const finalTitle = await page.title();
    finalText = await page.evaluate(() => document.body.innerText);
    
    console.log('📊 RESULT:');
    console.log('   URL:', finalUrl);
    console.log('   Title:', finalTitle);
    console.log('   Has Credentials:', finalText.toLowerCase().includes('credential') ? '✅' : '❌');
    console.log('   Has Submit:', finalText.toLowerCase().includes('submit') ? '✅' : '❌');
    
    // Screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-final-test.png', fullPage: true });
    console.log('\n📸 Screenshot: /home/jay/FactureX/buckydrop-final-test.png');
    
    // Show key content
    const hasForm = finalText.toLowerCase().includes('platform intro');
    console.log('\n📄 Content:', hasForm ? '✅ Formulaire API accessible!' : '❌ Page de login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();