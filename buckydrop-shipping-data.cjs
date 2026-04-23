const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Buckydrop Shipping Records - Data Extraction\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  // Login
  console.log('🔐 Connexion Buckydrop...');
  await page.goto('https://www.buckydrop.com/en/login/');
  await page.waitForSelector('#accountName');
  await page.type('#accountName', 'mungedijeancy@gmail.com');
  await page.type('#password', 'Mungedi@361993');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 30000 });
  console.log('✅ Connecté !\n');

  // Go directly to Shipping Records
  console.log('📦 Navigation vers Shipping Records...');
  await page.goto('https://www.buckydrop.com/en/admin/parcels/normal', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  // Take screenshot
  await page.screenshot({ path: '/home/jay/FactureX/buckydrop-shipping-records.png', fullPage: true });
  console.log('📸 Screenshot: buckydrop-shipping-records.png\n');

  // Extract parcel data from table
  console.log('📊 Extraction des données des colis...\n');

  const parcels = await page.evaluate(() => {
    const results = [];
    
    // Try to find table rows
    const rows = Array.from(document.querySelectorAll('tr'));
    
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
      if (cells.length > 0) {
        results.push(cells);
      }
    }
    
    return results;
  });

  console.log(`✅ ${parcels.length} lignes trouvées`);
  console.log('\nDonnées des colonnes:');
  console.log(JSON.stringify(parcels.slice(0, 10), null, 2));

  // Extract parcel details using better selectors
  console.log('\n🔍 Extraction détaillée...\n');

  const detailedData = await page.evaluate(() => {
    const parcels = [];
    
    // Look for specific parcel elements
    const parcelRows = document.querySelectorAll('[class*="parcel"]');
    
    // Try to find data in different structures
    const dataElements = Array.from(document.querySelectorAll('div, span, td')).filter(el => {
      const text = el.innerText || '';
      return (
        text.match(/\d{8,}/) || // Order numbers
        text.match(/P\d{5,}/) || // Parcel IDs
        text.match(/S\d{5,}/) || // Shipping IDs
        text.match(/UF\d{5,}/)   // Fulfillment IDs
      );
    }).slice(0, 20);

    return dataElements.map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.innerText?.substring(0, 100)
    }));
  });

  console.log('Éléments avec IDs trouvés:', detailedData);

  // Check for JSON data in scripts
  console.log('\n📋 Recherche de données JSON...');
  const scripts = await page.$$eval('script', scripts => 
    scripts.map(s => s.innerText).filter(t => t.includes('parcel') || t.includes('order'))
  );
  
  console.log('Scripts pertinents:', scripts.slice(0, 3));

  // Export to file
  const fs = require('fs');
  const exportData = {
    timestamp: new Date().toISOString(),
    url: page.url(),
    title: await page.title(),
    parcels: parcels.slice(0, 50)
  };
  
  fs.writeFileSync('/home/jay/FactureX/buckydrop-shipping-data.json', JSON.stringify(exportData, null, 2));
  console.log('\n💾 Données exportées: buckydrop-shipping-data.json');

  await browser.close();
  console.log('\n🎉 Terminé !');
})();