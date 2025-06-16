#!/bin/bash

# Set environment variables for www-data
export PUPPETEER_CACHE_DIR="/var/cache/puppeteer"
export XDG_CONFIG_HOME="/tmp"
export HOME="/var/www"

# Find Node.js executable
NODE_EXEC="/usr/bin/node"
if [ -f "/home/ubuntu/.nvm/versions/node/v18.7.0/bin/node" ]; then
    NODE_EXEC="/home/ubuntu/.nvm/versions/node/v18.7.0/bin/node"
fi

# Change to the scrape directory
cd /var/www/html/scrape

# Execute the crawler with environment variables
PUPPETEER_CACHE_DIR="/var/cache/puppeteer" $NODE_EXEC basic-crawler.js "$@"
