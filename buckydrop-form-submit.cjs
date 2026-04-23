const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Solution API - Form Submission\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 2000 });
  
  try {
    // Step 1: Login on main Buckydrop
    console.log('🔐 Step 1: Login to Buckydrop...');
    await page.goto('https://www.buckydrop.com/en/login/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    if (await page.$('#accountName')) {
      await page.type('#accountName', 'mungedijeancy@gmail.com');
      await page.type('#password', 'Mungedi@361993');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ timeout: 30000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 3000));
      console.log('✅ Logged in');
    }
    
    // Step 2: Navigate to Solution API
    console.log('\n🔧 Step 2: Navigate to Solution API Control...');
    await page.goto('https://solution-api.buckydrop.com/en/control', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Save initial screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-form-1-initial.png', fullPage: true });
    console.log('📸 Screenshot initial\n');
    
    // Step 3: Fill form fields
    console.log('📝 Step 3: Filling form fields...\n');
    
    // Username
    console.log('   Filling Username...');
    const usernameInput = await page.$('input[placeholder*="Username"]');
    if (usernameInput) {
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type('Jeancy Mungedi');
    }
    
    // Contacts
    console.log('   Filling Contacts...');
    const contactsInput = await page.$('input[placeholder*="Contacts"]');
    if (contactsInput) {
      await contactsInput.click({ clickCount: 3 });
      await contactsInput.type('Jeancy Mungedi');
    }
    
    // Email
    console.log('   Filling Email...');
    const emailInput = await page.$('input[placeholder*="Email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('mungedijeancy@gmail.com');
    }
    
    // Phone No.
    console.log('   Filling Phone...');
    const phoneInput = await page.$('input[placeholder*="Phone"]');
    if (phoneInput) {
      await phoneInput.click({ clickCount: 3 });
      await phoneInput.type('+243xxxxxxxxx');
    }
    
    // Platform Link
    console.log('   Filling Platform Link...');
    const linkInput = await page.$('input[placeholder*="Platform Link"]');
    if (linkInput) {
      await linkInput.click({ clickCount: 3 });
      await linkInput.type('https://facturex.app');
    }
    
    // Platform Intro - Use JavaScript to set value
    console.log('   Filling Platform Intro...');
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length >= 1) {
        textareas[0].value = `FactureX is a comprehensive financial management and e-commerce solution designed for the African market, specifically serving businesses in the Democratic Republic of Congo. Our platform streamlines operations for small and medium enterprises by integrating:
- Financial Management: Invoicing, expense tracking, and real-time financial reporting
- Order Automation: Seamless integration with logistics partners for dropshipping operations
- Multi-currency Support: USD, CNY, and local currencies for cross-border trade
- Business Intelligence: Automated daily reports and real-time analytics

As the African e-commerce market continues to grow rapidly, FactureX bridges the gap between local businesses and international suppliers. Our partnership with BuckyDrop will enable us to:
- Automate procurement from Chinese suppliers
- Provide real-time tracking to our customers
- Scale operations across multiple African countries
- Reduce manual processing time by 80% through API integration

We aim to process 500+ monthly orders within the first year, creating significant business volume for BuckyDrop while empowering African entrepreneurs with world-class logistics infrastructure.`;
      }
    });
    
    // Brief Request Description
    console.log('   Filling Brief Request Description...');
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length >= 2) {
        textareas[1].value = `We are seeking BuckyDrop Solution API access to build a fully automated dropshipping ecosystem between China and the Democratic Republic of Congo.

ORDER MANAGEMENT:
- Create Shop Order API: To automatically submit purchase orders to BuckyDrop based on customer orders received through our platform
- Order Details Query: To retrieve order status and fulfillment information for customer support and tracking

REAL-TIME SYNCHRONIZATION:
- Notify Parcel Status: Webhook integration to receive instant updates on shipment progress
- Parcel Details Query: To fetch complete shipping information including tracking numbers, weights, and delivery estimates

LOGISTICS INTELLIGENCE:
- Shipping Rate Estimate API: To calculate shipping costs in real-time and provide accurate quotes to our customers before order confirmation
- Supplement Domestic Logistics API: To enrich shipping data with domestic Chinese courier information

TECHNICAL IMPLEMENTATION:
Our system is built with React/TypeScript frontend and Supabase backend. We will implement:
- Automated webhook handlers for status updates
- Batch processing for high-volume order submissions
- Error handling and retry mechanisms for reliability
- Monitoring dashboard for API usage tracking

This integration will eliminate manual order processing, reduce errors, and provide our customers with transparent, real-time tracking information throughout the delivery journey.`;
      }
    });
    
    // Save screenshot after filling
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-form-2-filled.png', fullPage: true });
    console.log('📸 Screenshot after filling form\n');
    
    // Step 4: Select APIs (checkboxes)
    console.log('✅ Step 4: Selecting APIs...\n');
    
    // Order APIs
    const orderApis = ['Create Shop Order', 'Cancel Shop Order', 'Order Details Query'];
    for (const apiName of orderApis) {
      const checkbox = await page.$(`text=${apiName}`);
      if (checkbox) {
        console.log(`   ✅ Selecting: ${apiName}`);
        await checkbox.click().catch(() => {});
      }
    }
    
    // Notification APIs  
    const notificationApis = ['Notify Po Status', 'Notify Po Pending', 'Notify Parcel Status'];
    for (const apiName of notificationApis) {
      const checkbox = await page.$(`text=${apiName}`);
      if (checkbox) {
        console.log(`   ✅ Selecting: ${apiName}`);
        await checkbox.click().catch(() => {});
      }
    }
    
    // Parcel APIs
    const parcelApi = 'Parcel Details Query';
    const parcelCheckbox = await page.$(`text=${parcelApi}`);
    if (parcelCheckbox) {
      console.log(`   ✅ Selecting: ${parcelApi}`);
      await parcelCheckbox.click().catch(() => {});
    }
    
    // Product APIs (only Category)
    const productApi = 'Product Category';
    const productCheckbox = await page.$(`text=${productApi}`);
    if (productCheckbox) {
      console.log(`   ✅ Selecting: ${productApi}`);
      await productCheckbox.click().catch(() => {});
    }
    
    // Logistics APIs
    const logisticsApis = ['Shipping Rate Estimate', 'Supplement Domestic Logistics'];
    for (const apiName of logisticsApis) {
      const checkbox = await page.$(`text=${apiName}`);
      if (checkbox) {
        console.log(`   ✅ Selecting: ${apiName}`);
        await checkbox.click().catch(() => {});
      }
    }
    
    // Save screenshot after selecting APIs
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-form-3-apis.png', fullPage: true });
    console.log('📸 Screenshot after selecting APIs\n');
    
    // Step 5: Accept agreements
    console.log('📋 Step 5: Accepting agreements...');
    const agreeCheckbox = await page.$('text=I\'ve fully understood');
    if (agreeCheckbox) {
      console.log('   ✅ Clicking agreement checkbox');
      await agreeCheckbox.click().catch(() => {});
    }
    
    // Step 6: Submit
    console.log('\n🚀 Step 6: Submitting form...');
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-form-4-before-submit.png', fullPage: true });
    
    const submitBtn = await page.$('text=Submit for Review');
    if (submitBtn) {
      console.log('   ✅ Found Submit button, clicking...');
      await submitBtn.click().catch(async () => {
        // Try clicking by button selector
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const btnText = await btn.evaluate(el => el.innerText);
          if (btnText && btnText.includes('Submit')) {
            await btn.click();
            console.log('   ✅ Clicked submit button');
            break;
          }
        }
      });
      
      await new Promise(r => setTimeout(r, 5000));
    }
    
    // Final screenshot
    await page.screenshot({ path: '/home/jay/FactureX/buckydrop-form-5-final.png', fullPage: true });
    console.log('📸 Final screenshot saved\n');
    
    // Check result
    const finalUrl = page.url();
    const finalTitle = await page.title();
    const finalText = await page.evaluate(() => document.body.innerText);
    
    console.log('📄 RESULT:');
    console.log(`   URL: ${finalUrl}`);
    console.log(`   Title: ${finalTitle}`);
    
    if (finalText.toLowerCase().includes('submitted') || finalText.toLowerCase().includes('review')) {
      console.log('   ✅ Form submitted successfully!');
    } else if (finalText.toLowerCase().includes('under review')) {
      console.log('   ✅ Form is under review!');
    } else {
      console.log('   ⚠️ Check screenshot for result');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await browser.close();
  console.log('\n🎉 Done!');
})();