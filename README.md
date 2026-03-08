# OTA Crawl Scraper

This project scrapes attraction ticket data from Trip.com for multiple countries using Playwright.

## Prerequisites
- Node.js (v16 or higher recommended)
- Git

## Setup & Deployment Steps

### 1. Clone the Repository
```
git clone git@github.com:syednizamudeen/scrape-attraction-tickets.git
cd scrape-attraction-tickets
```

### 2. Pull Latest Changes (Production)
```
git pull
```

### 3. Install Dependencies
```
npm install
```

### 4. Make Shell Script Executable
```
chmod +x run_scrapers.sh
```

### 5. Install Playwright Browsers
```
npx playwright install
```

### 6. Update Configuration
Edit `config/config.json` to set:
- `outputDir`: Directory for output files (e.g., `output/`)
- `maxScrolls`: Number of scrolls per page
- `waitTimeout`: Wait time (ms) after each scroll

Example:
```
{
  "outputDir": "output",
  "maxScrolls": 20,
  "waitTimeout": 2000
}
```

pm install -g pm2
pm install -g pm2
### 7. Start the Application (Scrapping)
Run the scraper by specifying the platform type and the URL:
```
node index.js <platform_type> <url>
```
For Trip.com, use:
```
node index.js trip https://www.trip.com/things-to-do/
```
As you add new platforms, use their platform type and URL:
```
node index.js <new_platform_type> <url>
```

### 8. Run Multiple Scrapers in Parallel
Use the shell script to run all scrapers at once:
```
./run_scrapers.sh
```

### 9. (Optional) Use a Process Manager for Production
For reliability, use PM2:
```
pm install -g pm2
pm2 start index.js --name ota-crawl -- trip <url>
```

### 10. Check Output
- Card names: `output/card_names_<country>_<timestamp>.txt`
- Ticket details: `output/ticket_details_<country>_<timestamp>.csv`

### 11. Logs
- Logs are written to the `logs/` directory.

## Troubleshooting
- Ensure Playwright browsers are installed (`npx playwright install`).
- Check config file for correct settings.
- Make sure `output/` and `logs/` directories are writable.
- Review logs for errors.

## Updating Configuration
To change scraping settings, edit `config/config.json` and restart the app.

## License
MIT
