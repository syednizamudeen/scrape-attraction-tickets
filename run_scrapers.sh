#!/bin/bash

# List your platform types and URLs here
SCRAPERS=(
  "trip https://www.trip.com/things-to-do/"
  # Add more lines as needed: "<platform_type> <url>"
)

for SCRAPER in "${SCRAPERS[@]}"; do
  # Run each scraper in the background
  node index.js $SCRAPER &
done

# Wait for all background jobs to finish
wait
echo "All scraping jobs completed."
