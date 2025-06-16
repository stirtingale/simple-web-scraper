# Web Scraper API

A robust web scraping service built with PHP and Node.js/Puppeteer that provides clean, structured content extraction from web pages. Designed for integration with automation platforms like Make.com.

## Features

- 🚀 **High-performance web scraping** using Puppeteer with Chrome headless browser
- 🔍 **Intelligent content extraction** - automatically removes headers, footers, ads, and navigation
- 🛡️ **Bot detection avoidance** with realistic browser headers and behavior
- 🌐 **RESTful API** with JSON responses
- 📊 **Structured data output** including title, clean text content, headings, and metadata
- ⚡ **Concurrent crawling** support for multiple URLs
- 🔧 **Make.com ready** - optimized for HTTP module integration

## Installation

### Prerequisites

- **Linux server** (Ubuntu/Debian recommended)
- **Node.js** (version 14.0.0 or higher)
- **PHP** (version 7.4 or higher)
- **Web server** (Apache/Nginx)

### Step 1: Install Node.js and Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install Puppeteer and Chrome Dependencies

```bash
# Navigate to your project directory
cd /var/www/html/scrape

# Install npm dependencies
npm install

# Install Chrome dependencies for headless browsing
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo-gobject2 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

### Step 3: Setup Puppeteer Cache Directory

```bash
# Create cache directory with proper permissions
sudo mkdir -p /var/cache/puppeteer
sudo chown -R www-data:www-data /var/cache/puppeteer
sudo chmod -R 755 /var/cache/puppeteer

# Set up environment file
echo "PUPPETEER_CACHE_DIR=/var/cache/puppeteer" > .env
echo "DEBUG_MODE=false" >> .env
```

### Step 4: Configure Web Server Permissions

```bash
# Make the crawler script executable
chmod +x run-crawler.sh

# Set proper ownership for web server
sudo chown -R www-data:www-data /var/www/html/scrape
sudo chmod -R 755 /var/www/html/scrape
```

### Step 5: Test Installation

```bash
# Test Node.js crawler directly
node basic-crawler.js https://example.com

# Test PHP web interface
curl "http://localhost/scrape/?url=https://example.com"
```

## Usage

### Direct Command Line Usage

```bash
# Crawl a single URL
node basic-crawler.js https://example.com

# Crawl multiple URLs
node basic-crawler.js https://example.com https://github.com

# Output JSON format (for integration)
node basic-crawler.js --json https://example.com
```

### HTTP API Usage

The web scraper provides a REST API endpoint that accepts URL parameters and returns JSON responses.

#### Endpoint
```
GET /scrape/?url=https://example.com
POST /scrape/ (with url in form data)
```

#### Example Request
```bash
curl "http://yourserver.com/scrape/?url=https://example.com"
```

#### Example Response
```json
{
  "success": true,
  "url": "https://example.com",
  "timestamp": "2024-12-16T10:30:00.000Z",
  "duration": 2456,
  "title": "Example Domain",
  "textContent": "This domain is for use in illustrative examples...",
  "headings": [
    {
      "tag": "h1",
      "text": "Example Domain"
    }
  ],
  "wordCount": 45,
  "meta": {
    "description": "This domain is for use in illustrative examples",
    "keywords": "",
    "author": ""
  },
  "execution_time_ms": 2456,
  "processed_by": "PHP Web Interface"
}
```

## Make.com Integration

### Setting up the HTTP Module

1. **Add HTTP Module**: In your Make.com scenario, add an "HTTP" module and select "Make a request"

2. **Configure Request**:
   - **URL**: `http://yourserver.com/scrape/`
   - **Method**: `GET`
   - **Query String**: Add parameter `url` with the website URL you want to scrape

3. **Headers** (optional but recommended):
   ```
   Content-Type: application/json
   User-Agent: Make.com Integration Bot
   ```

### Make.com Configuration Examples

#### Basic URL Scraping
```
URL: http://yourserver.com/scrape/
Method: GET
Query String: 
  - url: {{your_target_url}}
```

#### With Error Handling
Set up error handling in Make.com:
- **Success condition**: `success = true`
- **Error handling**: Check for `success = false` and handle `error` field

#### Extracting Data
Access the returned data in subsequent modules:
- **Page Title**: `{{response.title}}`
- **Clean Text**: `{{response.textContent}}`
- **Word Count**: `{{response.wordCount}}`
- **Headings**: `{{response.headings}}`
- **Meta Description**: `{{response.meta.description}}`

### Advanced Make.com Scenarios

#### 1. Monitor Website Changes
```yaml
Trigger: Schedule (every hour)
Action 1: HTTP Request to scrape target URL
Action 2: Compare with previous content (using Data Store)
Action 3: Send notification if content changed
```

#### 2. Bulk URL Processing
```yaml
Input: CSV/JSON with URLs
Iterator: Loop through URLs
Action: HTTP Request for each URL
Output: Aggregate results to Google Sheets
```

#### 3. Content Analysis Pipeline
```yaml
Action 1: HTTP Request to scrape URL
Action 2: Send text content to OpenAI for analysis
Action 3: Store results in Airtable/Notion
Action 4: Send summary email
```

### Step-by-Step Make.com Setup

#### 1. Create New Scenario
1. Log into your Make.com account
2. Click "Create a new scenario"
3. Choose your trigger (Schedule, Webhook, etc.)

#### 2. Add HTTP Module
1. Click the "+" button to add a module
2. Search for "HTTP" and select "HTTP"
3. Choose "Make a request"

#### 3. Configure HTTP Request
```
URL: http://your-server.com/scrape/
Method: GET
Query String:
  Name: url
  Value: https://example.com (or use variable from previous module)

Headers (optional):
  Name: Content-Type
  Value: application/json
  
  Name: User-Agent
  Value: Make.com Bot v1.0
```

#### 4. Test the Connection
1. Click "Run once" to test
2. Verify you receive a JSON response with `success: true`
3. Check the returned data structure

#### 5. Use the Scraped Data
In subsequent modules, access the data using:
- `{{1.title}}` - Page title
- `{{1.textContent}}` - Clean text content
- `{{1.wordCount}}` - Word count
- `{{1.meta.description}}` - Meta description
- `{{1.headings}}` - Array of headings

#### 6. Error Handling Setup
1. Right-click the HTTP module
2. Select "Add error handler"
3. Add a filter: `{{1.success}} = false`
4. Connect to notification or logging module

## API Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the scraping was successful |
| `url` | string | The scraped URL |
| `timestamp` | string | ISO timestamp of the request |
| `duration` | number | Time taken to scrape (milliseconds) |
| `title` | string | Page title |
| `textContent` | string | Clean, extracted text content |
| `headings` | array | Structured heading data |
| `wordCount` | number | Number of words in content |
| `meta` | object | Page metadata (description, keywords, author) |
| `error` | string | Error message (if success = false) |

## Error Handling

The API returns appropriate HTTP status codes:
- **200**: Success
- **400**: Bad request (missing/invalid URL)
- **500**: Server error (crawler failure)

Common error responses:
```json
{
  "success": false,
  "error": "Invalid URL format",
  "provided_url": "not-a-url",
  "timestamp": "2024-12-16T10:30:00.000Z"
}
```

## Configuration

### Environment Variables (.env file)
```env
PUPPETEER_CACHE_DIR=/var/cache/puppeteer
DEBUG_MODE=false
```

### Crawler Options
The crawler includes several optimizations:
- **Bot detection avoidance**: Realistic user agents and headers
- **Resource blocking**: Images and fonts blocked for faster loading
- **Content filtering**: Automatic removal of ads, navigation, footers
- **Timeout handling**: 30-second timeout for page loads

## Troubleshooting

### Common Issues

1. **Chrome not found**
   ```bash
   # Download Chrome manually if needed
   sudo apt-get install -y google-chrome-stable
   ```

2. **Permission errors**
   ```bash
   sudo chown -R www-data:www-data /var/www/html/scrape
   sudo chmod +x run-crawler.sh
   ```

3. **Node.js not found**
   ```bash
   which node
   # Update the path in run-crawler.sh if needed
   ```

4. **Memory issues**
   ```bash
   # Increase PHP memory limit
   ini_set('memory_limit', '512M');
   ```

5. **Make.com Connection Issues**
   - Verify your server URL is accessible from the internet
   - Check firewall settings (port 80/443 open)
   - Test the API endpoint manually: `curl "http://yourserver.com/scrape/?url=https://example.com"`
   - Ensure SSL certificate is valid if using HTTPS

### Debug Mode
Enable debug mode in `.env`:
```env
DEBUG_MODE=true
```

This will log detailed information to help diagnose issues.

### Make.com Specific Troubleshooting

1. **HTTP Module Returns Error**
   - Check the URL format (include http:// or https://)
   - Verify the server is responding: `curl -I http://yourserver.com/scrape/`
   - Check Make.com execution logs for detailed error messages

2. **Empty or Null Response**
   - Test the API directly with curl
   - Check if the target website blocks your server's IP
   - Verify the scraped website allows automated access

3. **Timeout Errors**
   - Increase timeout in Make.com HTTP module settings
   - Check server resources (CPU, memory)
   - Test with simpler websites first

## Performance Notes

- **Concurrent requests**: The system can handle multiple concurrent requests
- **Resource optimization**: Images and fonts are blocked to improve speed
- **Memory management**: Browser instances are properly closed after each request
- **Caching**: Consider implementing response caching for frequently accessed URLs
- **Rate limiting**: Implement rate limiting for production use

## Security Considerations

- **URL validation**: All URLs are validated before processing
- **CORS enabled**: API supports cross-origin requests
- **Rate limiting**: Consider implementing rate limiting for production use
- **Input sanitization**: All inputs are properly escaped and validated
- **Server security**: Ensure your server is properly secured and updated

## Advanced Make.com Integrations

### 1. Website Monitoring Dashboard
Create a scenario that:
1. Scrapes multiple websites on schedule
2. Compares content with previous versions
3. Updates a Google Sheet with changes
4. Sends Slack notifications for important updates

### 2. SEO Content Analysis
Build a workflow that:
1. Scrapes competitor websites
2. Analyzes word count and headings
3. Sends data to ChatGPT for SEO recommendations
4. Saves results to Airtable

### 3. News Aggregation
Set up automation to:
1. Scrape multiple news sources
2. Extract article content
3. Summarize using AI
4. Post to social media or newsletter

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the debug logs when `DEBUG_MODE=true`
3. Test with simple URLs first (like `https://example.com`)
4. Ensure all dependencies are properly installed
5. For Make.com specific issues, check the execution history and error logs in your Make.com dashboard