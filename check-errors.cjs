const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    const response = await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log("STATUS:", response.status());
    // wait a bit for react to mount
    await new Promise(r => setTimeout(r, 3000));
    const html = await page.content();
    console.log("HTML:", html.substring(0, 500));
  } catch (e) {
    console.log('Timeout or error:', e.message);
  }
  
  await browser.close();
})();
