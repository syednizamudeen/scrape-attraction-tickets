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

### 4. Install Playwright Browsers
```
npx playwright install
```

### 5. Update Configuration
Edit `config/config.json` to set:
- `urls`: Array of Trip.com URLs to scrape
- `outputDir`: Directory for output files (e.g., `output/`)
- `maxScrolls`: Number of scrolls per page
- `waitTimeout`: Wait time (ms) after each scroll

Example:
```
{
  "urls": [
    "https://www.trip.com/things-to-do/list?pagetype=city&keyword=singapore&pshowcode=Ticket2&kwdfrom=srch&ext-searchpage=1"
  ],
  "outputDir": "output",
  "maxScrolls": 20,
  "waitTimeout": 2000
}
```

### 6. Start the Application
```
npm start
```

### 7. (Optional) Use a Process Manager for Production
For reliability, use PM2:
```
pm install -g pm2
pm2 start index.js --name ota-crawl
```

### 8. Check Output
- Card names: `output/card_names_<country>_<timestamp>.txt`
- Ticket details: `output/ticket_details_<country>_<timestamp>.json`

### 9. Logs
- Logs are written to the `logs/` directory.

## Troubleshooting
- Ensure Playwright browsers are installed (`npx playwright install`).
- Check config file for correct URLs and settings.
- Make sure `output/` and `logs/` directories are writable.
- Review logs for errors.

## Updating Configuration
To change scraping targets or settings, edit `config/config.json` and restart the app.

## License
MIT
