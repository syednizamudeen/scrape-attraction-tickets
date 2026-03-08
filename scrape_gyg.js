const { chromium } = require("playwright");
const { randomUserAgent } = require("./user_agents");

async function scrapeGYG(url, { fs, log, config }) {
      const startTime = new Date();
    // Block images and fonts for speed
    function setupResourceBlock(page) {
      page.route('**/*', (route) => {
        const req = route.request();
        const resourceType = req.resourceType();
        if (["image", "font"].includes(resourceType)) {
          return route.abort();
        }
        return route.continue();
      });
    }
  log(`Scraping GYG for URL: ${url}`);
  let browser, context, page;
  const outputDir = config.outputDir || "output";
  const waitTimeout = config.waitTimeout || 2000;
  let results = [];
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      extraHTTPHeaders: {
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.google.com/",
      },
    });
    page = await context.newPage();
    setupResourceBlock(page);
    log(`Navigating to page: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(waitTimeout + Math.random() * 1500);
    let hasShowMore = true;
    let pageCount = 1;
    let results = [];
    let uniqueProducts = new Set();
    let noNewProductsTries = 0;
    while (hasShowMore) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(waitTimeout + Math.random() * 1500);
      const products = await page.evaluate(() => {
        const layouts = document.querySelectorAll('.activity-card-block');
        let items = [];
        layouts.forEach(layout => {
          const title = layout.querySelector('.text-atom--title-4 span');
          let link = '';
          const anchor = layout.querySelector('a.vertical-activity-card__container');
          if (anchor && anchor.href) {
            link = anchor.href;
          }
          if (title && title.innerText) {
            items.push({
              productName: title.innerText.trim(),
              link
            });
          }
        });
        return items;
      });
      let newProducts = 0;
      for (const product of products) {
        if (!uniqueProducts.has(product.productName)) {
          uniqueProducts.add(product.productName);
          let ticketName = '';
          if (product.link) {
            try {
              // Open new page for each product link
              const innerPage = window.open(product.link, '_blank');
              // This is a placeholder for Playwright context, actual navigation must be done outside evaluate
              // So we will collect links and navigate after scraping main page
              ticketName = null; // Will be filled later
            } catch (e) {
              ticketName = '';
            }
          }
          results.push({ productName: product.productName, link: product.link, page: pageCount, ticketName });
          newProducts++;
        }
      }
      log(`Found ${products.length} products on page ${pageCount}, ${newProducts} new unique products`);
      if (newProducts === 0) {
        noNewProductsTries++;
      } else {
        noNewProductsTries = 0;
      }
      const showMoreSelector = '.show-more button';
      const showMoreVisible = await page.$(showMoreSelector);
      if (showMoreVisible && noNewProductsTries < 3) {
        log('Clicking Show more to load next page');
        await showMoreVisible.click();
        await page.waitForTimeout(waitTimeout + Math.random() * 1500);
        pageCount++;
      } else {
        hasShowMore = false;
      }
    }
    // Write results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    // Now, for each result with a link, navigate and extract ticket name
    for (let row of results) {
      if (row.link) {
        log(`Scraping inner page for product: ${row.productName} (${row.link})`);
        try {
          const innerPage = await context.newPage();
          await innerPage.goto(row.link, { waitUntil: "domcontentloaded", timeout: 60000 });
          log(`Loaded inner page for: ${row.productName}`);
          // Extract ticket name, price, and discount from inner page
          const innerData = await innerPage.evaluate(() => {
            const span = document.querySelector('div.z-layout h1.text-atom--title-1 span');
            let ticketName = span ? span.innerText.trim() : '';
            let price = '';
            let discount = '';
            // Price info
            const priceSection = document.querySelector('section.price-info');
            if (priceSection) {
              const actualPrice = priceSection.querySelector('ins span.text-atom--title-2 span');
              if (actualPrice) price = actualPrice.innerText.trim();
              const basePrice = priceSection.querySelector('del span.text-atom--body-strong span');
              if (basePrice) discount = basePrice.innerText.trim();
            }
            return { ticketName, price, discount };
          });
          log(`Extracted ticket name for ${row.productName}: ${innerData.ticketName}`);
          log(`Extracted price for ${row.productName}: ${innerData.price}`);
          log(`Extracted discount for ${row.productName}: ${innerData.discount}`);
          row.ticketName = innerData.ticketName;
          row.price = innerData.price;
          row.discount = innerData.discount;
          await innerPage.close();
        } catch (e) {
          log(`Error scraping inner page for ${row.productName}: ${e.message}`);
          row.ticketName = '';
          row.price = '';
          row.discount = '';
        }
      } else {
        row.ticketName = '';
        row.price = '';
        row.discount = '';
      }
    }
    // Parse country from URL
    let country = '';
    try {
      const urlObj = new URL(url);
      // Try to extract country from pathname, e.g. /country/... or /destinations/country
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        country = pathParts[0];
      }
    } catch (e) {
      country = '';
    }
    const scraped_date_time = new Date().toISOString();
    const endTime = new Date();
    const filePath = `${outputDir}/gyg_products_${timestamp}.csv`;
    fs.writeFileSync(filePath, "country,productName,ticketName,price,discount,scraped_date_time,startTime,endTime,totalProducts\n", "utf8");
    for (const row of results) {
      fs.appendFileSync(
        filePath,
        `${country},${row.productName},${row.ticketName || ''},${row.price || ''},${row.discount || ''},${scraped_date_time},${startTime.toISOString()},${endTime.toISOString()},${results.length}\n`,
        "utf8"
      );
    }
    log(`Saved product names to ${filePath}`);
    await browser.close();
    return results;
  } catch (err) {
    log(`Error scraping GYG URL: ${url} - ${err.message}`);
    if (browser) await browser.close();
    throw err;
  }
}

module.exports = { scrapeGYG };