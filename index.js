
const fs = require("fs");
const { log } = require("./logger");
const config = require("./config/config.json");
const { scrapeTrip } = require("./scrape_trip");

(async () => {
  // Accept platform type and URL from command line arguments
  const platformType = process.argv[2];
  const url = process.argv[3];
  if (!platformType || !url) {
    log("Usage: node index.js <platform_type> <url>");
    process.exit(1);
  }
  log(`Starting scraping for platform: ${platformType}, URL: ${url}`);
  if (platformType === "trip") {
    const startTime = new Date();
    let results;
    try {
      results = await scrapeTrip(url, { fs, log, config });
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
    log(`Writing ticket details to file: ${config.outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`);
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    // Write CSV header
    fs.writeFileSync(
      `${config.outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`,
      "country,productName,ticketName,price,discount,scraped_date_time,region_scrape_start_time,region_scrape_end_time,region_product_count\n",
      "utf8",
    );
    for (const row of results) {
      fs.appendFileSync(
        `${config.outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`,
        `${row.country},${row.productName},${row.ticketName},${row.price},${row.discount},${row.scraped_date_time},${startTime.toISOString()},${endTime.toISOString()},${results.length}\n`,
        "utf8",
      );
    }
    log(`Saved ticket details to ${config.outputDir}/ticket_details_${countryForFile}_${timestamp}.csv`);
    log('Finished scraping for platform: trip');
  } else if (platformType === "gyg") {
    log(`Starting scraping for platform: gyg, URL: ${url}`);
    const { scrapeGYG } = require("./scrape_gyg");
    let results;
    try {
      results = await scrapeGYG(url, { fs, log, config });
    } catch (err) {
      log(`Scraping failed for URL: ${url} - ${err.message}`);
      process.exit(1);
    }
    // TODO: Implement file writing logic similar to trip
    log('Finished scraping for platform: gyg');
  } else {
    log(`Platform type '${platformType}' is not supported yet.`);
    process.exit(1);
  }
})();
