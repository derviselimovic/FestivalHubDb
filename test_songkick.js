const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
  });
  const context = await browser.newContext({ 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  
  try {
    // Try using the Wayback Machine for a cached version
    console.log('Navigating to Wayback Machine for Songkick festivals page...');
    await page.goto('https://web.archive.org/web/20250101000000*/https://www.songkick.com/festivals', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    
    console.log('Title:', await page.title());
    console.log('URL:', page.url());
    
    // Get all links that might be actual Songkick pages
    const links = await page.$$eval('a[href*="songkick"]', els => els.slice(0, 20).map(e => e.href));
    console.log('\nSongkick links found:', links);
    
  } catch(e) {
    console.error('Error:', e.message);
  }
  await browser.close();
})();
