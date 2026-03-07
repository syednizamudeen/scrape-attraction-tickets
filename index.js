const { chromium } = require("playwright");
const fs = require("fs");
const { log } = require("./logger");
const config = require("./config/config.json");

const outputDir = config.outputDir;
const maxScrolls = config.maxScrolls;
const waitTimeout = config.waitTimeout;

function setupResourceBlock(page) {
  page.route('**/*', (route) => {
    const req = route.request();
    const resourceType = req.resourceType();
    const url = req.url();
    if (["image", "stylesheet", "font"].includes(resourceType)) {
      return route.abort();
    }
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|woff|woff2|ttf|otf|eot|mp4|webm|avi|mov|m4v|mp3|ogg|wav|flac|zip|rar|7z|tar|gz|pdf)(\?|$)/i)) {
      return route.abort();
    }
    return route.continue();
  });
}

async function scrape(url) {
  log(`Launching browser for URL: ${url}`);
  let browser, context, page;
  try {
    browser = await chromium.launch({ headless: true });
    log(`Browser launched successfully for URL: ${url}`);
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
    log(`Page loaded: ${url}`);
    await page.waitForTimeout(3000 + Math.random() * 1500);
  } catch (err) {
    log(`Error launching browser or navigating to ${url}: ${err.message}`);
    if (browser) await browser.close();
    throw err;
  }

  log(`Starting scroll and card extraction for ${url}`);
  let prevCount = 0;
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(waitTimeout + Math.random() * 1500);
    const cardCount = await page.evaluate(() => document.querySelectorAll('h2[class*="TitleView_titleText"]').length);
    log(`Scroll ${i + 1}: cardCount=${cardCount}, prevCount=${prevCount}`);
    if (cardCount === prevCount) break;
    prevCount = cardCount;
  }
  log(`Finished scrolling. Total cards found: ${prevCount}`);

  log(`Extracting card data for ${url}`);
  const cardData = await page.evaluate(() => {
    const cards = document.querySelectorAll("a.xt-link");
    return Array.from(cards)
      .map((card) => {
        const nameElem = card.querySelector('h2[class*="TitleView_titleText"]');
        let countryElem = card.querySelector(
          'span[class*="vertical-card_location_text"]',
        );
        let country = countryElem ? countryElem.innerText.trim() : "";
        let crd = {
          name: nameElem ? nameElem.innerText.trim() : "",
          url: card.href,
          country,
        };
        return crd;
      })
      .filter((card) => card.name && card.url);
  });
  log(`Extracted ${cardData.length} cards for ${url}`);

  let countryForFile = "unknown";
  if (cardData.length > 0 && cardData[0].country) {
    countryForFile = cardData[0].country.replace(/\s+/g, "_").toLowerCase();
  } else {
    const match = url.match(/keyword=([^&]+)/);
    if (match && match[1]) {
      countryForFile = decodeURIComponent(match[1])
        .replace(/\s+/g, "_")
        .toLowerCase();
    }
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  log(`Writing card names to file: ${outputDir}/card_names_${countryForFile}_${timestamp}.txt`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    `${outputDir}/card_names_${countryForFile}_${timestamp}.txt`,
    cardData.map((c) => c.name).join("\n"),
    "utf8",
  );

  const ticketResults = [];
  for (const card of cardData) {
    log(`Scraping ticket details for card: ${card.name} (${card.url})`);
    let detailPage;
    try {
      detailPage = await context.newPage();
      setupResourceBlock(detailPage);
      log(`Navigating to detail page: ${card.url}`);
      await detailPage.goto(card.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      log(`Detail page loaded: ${card.url}`);
      await detailPage.waitForTimeout(3000 + Math.random() * 1500);

      const tickets = await detailPage.evaluate(() => {
        const results = [];
        const ticketContainers = document.querySelectorAll(
          'div[class*="shelf_shelf_main_container_wrap"]',
        );
        ticketContainers.forEach((container) => {
          const typeElem = container.querySelector(
            'span[class*="shelf_shelf_main_title_text_fusion_shelf"]',
          );
          const ticketType = typeElem ? typeElem.innerText.trim() : "";
          const priceElem = container.querySelector(
            'span[class*="card-price_card_price_currency"]',
          );
          const priceText = priceElem ? priceElem.innerText.trim() : "";
          const discountElem = container.querySelector(
            'div[class*="card-tips_card_discount_tag"] span',
          );
          const discountText = discountElem
            ? discountElem.innerText.trim()
            : "";
          if (ticketType && priceText) {
            results.push({
              ticketType,
              price: priceText,
              discount: discountText,
            });
          }
        });
        return results;
      });

      let productName = card.name;
      let country = card.country;
      const scraped_date_time = new Date().toISOString();

      for (const t of tickets) {
        ticketResults.push({
          country,
          productName,
          ticketName: t.ticketType,
          price: t.price,
          discount: t.discount,
          scraped_date_time,
        });
      }
    } catch (err) {
      log(`Error scraping ticket details for card: ${card.name} (${card.url}): ${err.message}`);
    } finally {
      if (detailPage) await detailPage.close();
    }
  }
  await browser.close();
  return ticketResults;
}


(async () => {
  // Accept URL from command line argument
  const url = process.argv[2];
  if (!url) {
    log("No URL provided. Usage: node index.js <url>");
    process.exit(1);
  }
  log(`Starting scraping for URL: ${url}`);
  const startTime = new Date();
  let results;
  try {
    results = await scrape(url);
  } catch (err) {
    log(`Scraping failed for URL: ${url} - ${err.message}`);
    process.exit(1);
  }
  const endTime = new Date();
  let countryForFile = "unknown";
  if (results.length > 0 && results[0].country) {
    countryForFile = results[0].country.replace(/\s+/g, "_").toLowerCase();
  } else {
    const match = url.match(/keyword=([^&]+)/);
    if (match && match[1]) {
      countryForFile = decodeURIComponent(match[1])
        .replace(/\s+/g, "_")
        .toLowerCase();
    }
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  log(`Writing ticket details to file: ${outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  // Write CSV header
  fs.writeFileSync(
    `${outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`,
    "country,productName,ticketName,price,discount,scraped_date_time,region_scrape_start_time,region_scrape_end_time,region_product_count\n",
    "utf8",
  );
  for (const row of results) {
    fs.appendFileSync(
      `${outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`,
      `${row.country},${row.productName},${row.ticketName},${row.price},${row.discount},${row.scraped_date_time},${startTime.toISOString()},${endTime.toISOString()},${results.length}\n`,
      "utf8",
    );
  }
  log(`Saved ticket details to ${outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`);
  log('Finished scraping for URL');
})();
