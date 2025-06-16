# Web Scraper API

A comprehensive web scraping service that provides a RESTful API for extracting clean content from web pages. The system uses Node.js crawlers with multiple extraction methods and a PHP API gateway for easy integration.

## Features

- **RESTful API**: Clean endpoint design with multiple routes
- **Multiple Crawlers**: Choice between basic HTTP crawler and advanced Cheerio-based parser
- **Anti-Detection**: Realistic browser headers and request patterns
- **Content Extraction**: Intelligent parsing that removes ads, navigation, and clutter
- **Redirect Tracking**: Full redirect chain analysis and final URL detection
- **Health Monitoring**: Built-in health checks and system status endpoints
- **Auto-Documentation**: Self-documenting API with usage examples
- **CORS Support**: Built-in cross-origin request support
- **Error Handling**: Comprehensive error responses with debugging information

## Architecture

The scraper consists of two main components:

1. **PHP API Gateway** (`index.php`) - Handles HTTP requests, routing, and responses
2. **Node.js Crawlers** - Two specialized crawlers for different use cases:
   - `basic-crawler.js` - Fast HTTP-only crawler with regex parsing (currently in use)
   - `simple-crawler.js` - Cheerio-based crawler with DOM manipulation

## Requirements

- PHP 7.4 or higher
- Node.js 14.x or higher
- npm (Node Package Manager)
- Web server (Apache, Nginx, or PHP built-in server)
- PHP extensions: `json` (usually enabled by default)

## Installation

### 1. Install Node.js and npm

**Ubuntu/Debian:**
```bash
# Install Node.js and npm
sudo apt update
sudo apt install -y nodejs npm

# Verify installation
node --version
npm --version
```

**CentOS/RHEL/Fedora:**
```bash
sudo dnf install nodejs npm
```

**macOS:**
```bash
brew install node
```

**Windows:**
Download and install from [Node.js official website](https://nodejs.org/)

### 2. Setup the Scraper

```bash
# Navigate to the scraper directory
cd /var/www/html/scrape

# Setup Node.js crawler dependencies
cd node-crawler

# Install dependencies
npm install

# Verify installation
npm list
```

### 3. Deploy the API

1. Ensure the `index.php` file is in your web server directory
2. Make sure the web server has execute permissions for Node.js scripts
3. Configure your web server to serve PHP files

### 4. Test Installation

Start PHP built-in server for testing:
```bash
cd /var/www/html/scrape
php -S localhost:8000
```

Test the API:
```bash
# View API documentation
curl "http://localhost:8000/"

# Test health check
curl "http://localhost:8000/health"

# Test scraping
curl "http://localhost:8000/?url=https://example.com"
```

## API Endpoints

### GET / - API Documentation
Returns comprehensive API documentation with usage examples.

```bash
curl "http://localhost:8000/"
```

### GET /health - Health Check
Checks system health including Node.js availability and crawler dependencies.

```bash
curl "http://localhost:8000/health"
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "node_available": true,
    "node_version": "v18.17.0",
    "npm_available": true,
    "npm_version": "9.6.7",
    "node_crawler_exists": true,
    "package_json_exists": true
  },
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

### GET /status - System Status
Returns detailed system information including memory usage and server details.

```bash
curl "http://localhost:8000/status"
```

### GET|POST /crawl - Crawl Website
Main scraping endpoint that extracts content from the specified URL.

**GET Request:**
```bash
curl "http://localhost:8000/crawl?url=https://example.com"
# OR shorthand
curl "http://localhost:8000/?url=https://example.com"
```

**POST Request (JSON):**
```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**POST Request (Form Data):**
```bash
curl -X POST http://localhost:8000/crawl \
  -d "url=https://example.com"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "url": "https://example.com",
  "final_url": "https://www.example.com",
  "redirects": {
    "count": 1,
    "chain": [
      {
        "from": "https://example.com",
        "to": "https://www.example.com",
        "status": 301
      }
    ],
    "followed_redirects": true
  },
  "status_code": 200,
  "title": "Example Domain",
  "content": "This domain is for use in illustrative examples in documents...",
  "meta": {
    "description": "Example domain for documentation",
    "url": "https://www.example.com",
    "charset": "utf-8",
    "content_type": "text/html; charset=UTF-8"
  },
  "timestamp": "2025-06-16T12:00:00.000Z",
  "word_count": 28
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid URL provided",
  "url": "invalid-url",
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

## Node.js Crawlers

### Dependencies

The project uses these npm packages:

```json
{
  "dependencies": {
    "axios": "^1.10.0",
    "cheerio": "^1.1.0",
    "jsdom": "^26.1.0",
    "puppeteer": "^24.10.1"
  }
}
```

### Basic Crawler (`basic-crawler.js`)

- **Method**: HTTP requests with axios
- **Parsing**: Regex-based HTML parsing
- **Features**: 
  - Redirect tracking
  - Charset detection
  - Advanced content filtering
  - Text extraction with formatting preservation
  - Comprehensive error handling

**Best for**: Fast crawling, simple websites, high-volume requests

### Simple Crawler (`simple-crawler.js`)

- **Method**: HTTP requests with axios + Cheerio DOM parsing
- **Parsing**: jQuery-like DOM manipulation
- **Features**:
  - Precise element selection
  - CSS selector-based content extraction
  - Clean HTML output
  - Efficient unwanted element removal

**Best for**: Complex websites, precise content extraction, structured data

## Configuration

### Crawler Selection

The PHP API currently uses `basic-crawler.js` by default. To switch to the Cheerio-based crawler, modify line 162 in `index.php`:

```php
$nodeCrawlerPath = __DIR__ . '/node-crawler/simple-crawler.js';
```

### Timeout Settings

Default timeout is 30 seconds for Node.js crawlers and 60 seconds for PHP execution.

**Node.js crawler timeout** (in crawler files):
```javascript
this.timeout = 30000; // 30 seconds
```

**PHP execution timeout** (in index.php):
```php
$command = "timeout 60 node " . escapeshellarg($scriptName) . " {$escapedUrl} 2>&1";
```

### Content Filtering

Both crawlers remove these elements by default:
- Scripts and stylesheets
- Advertisements and banners
- Navigation and sidebars
- Pop-ups and modals
- Social media widgets
- Comment sections
- Headers and footers

## Security Considerations

- **URL Validation**: All URLs are validated using `filter_var()`
- **Shell Injection Protection**: All shell arguments are properly escaped
- **Timeout Protection**: Commands are wrapped with timeout to prevent hanging
- **Error Sanitization**: Sensitive system information is filtered from error responses
- **CORS Configuration**: Cross-origin access is properly configured

## Troubleshooting

### Common Issues

**Node.js/npm not found:**
```bash
# Check if Node.js is installed
node --version
npm --version

# Install if missing
sudo apt install nodejs npm  # Ubuntu/Debian
sudo dnf install nodejs npm  # CentOS/RHEL/Fedora
```

**Dependencies not installed:**
```bash
cd /var/www/html/scrape/node-crawler
npm install
```

**Permission denied:**
```bash
# Ensure crawler scripts are executable
chmod +x node-crawler/*.js

# Check web server permissions
ls -la node-crawler/
```

**Crawler script not found:**
```bash
# Verify crawler exists
ls -la node-crawler/basic-crawler.js

# Check the path in index.php line 162
grep "nodeCrawlerPath" index.php
```

**Timeout errors:**
- Increase timeout values for slow-loading pages
- Check network connectivity
- Monitor server resources

**Empty or invalid JSON response:**
- Check Node.js error output by removing `2>&1` redirection
- Verify crawler script syntax: `node node-crawler/basic-crawler.js https://example.com`
- Check system logs for errors

### Debug Mode

**Test crawler directly:**
```bash
cd node-crawler
node basic-crawler.js https://example.com
node simple-crawler.js https://example.com
```

**Enable PHP error reporting:**
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

**Check health endpoint:**
```bash
curl -s "http://localhost:8000/health" | jq '.'
```

## Performance

- **Memory Usage**: ~50-100MB per request (Node.js process)
- **Processing Time**: 1-5 seconds depending on page complexity
- **Concurrent Requests**: Limited by server resources and Node.js processes
- **Scalability**: Can be load-balanced across multiple servers

## Examples

### JavaScript Client

```javascript
class ScraperClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async scrape(url) {
    const response = await fetch(`${this.baseUrl}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    return await response.json();
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }
}

// Usage
const scraper = new ScraperClient();
const result = await scraper.scrape('https://example.com');
console.log('Title:', result.title);
console.log('Content:', result.content);
```

### Python Client

```python
import requests
import json

class ScraperClient:
    def __init__(self, base_url='http://localhost:8000'):
        self.base_url = base_url
    
    def scrape(self, url):
        response = requests.post(f'{self.base_url}/crawl', json={'url': url})
        return response.json()
    
    def health(self):
        response = requests.get(f'{self.base_url}/health')
        return response.json()

# Usage
scraper = ScraperClient()
result = scraper.scrape('https://example.com')
print(f"Title: {result['title']}")
print(f"Word count: {result['word_count']}")
```

### Shell Scripts

**Basic scraping:**
```bash
#!/bin/bash
URL="$1"
if [ -z "$URL" ]; then
    echo "Usage: $0 <url>"
    exit 1
fi

curl -s -X POST http://localhost:8000/crawl \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$URL\"}" | jq '.'
```

**Batch processing:**
```bash
#!/bin/bash
while IFS= read -r url; do
    echo "Processing: $url"
    curl -s "http://localhost:8000/?url=$url" | jq -r '.title'
done < urls.txt
```

## Self-Hosted Module Integration

### Adding as a Make.com Module

To integrate this scraper as a custom module in your self-hosted Make.com instance:

#### 1. Create Module Structure

```bash
# Navigate to your Make.com modules directory
cd /path/to/make/modules

# Create the scraper module
mkdir web-scraper
cd web-scraper

# Create required module files
touch module.json
touch connection.json
touch scrape.json
mkdir functions
touch functions/scrape.js
```

#### 2. Module Configuration (`module.json`)

```json
{
  "name": "web-scraper",
  "label": "Web Scraper",
  "description": "Extract clean content from web pages",
  "version": "1.0.0",
  "author": "Your Organization",
  "base": {
    "url": "{{connection.host}}"
  },
  "connections": [
    "web-scraper"
  ],
  "webhook": false
}
```

#### 3. Connection Configuration (`connection.json`)

```json
{
  "name": "web-scraper",
  "type": "apikey",
  "label": "Web Scraper Connection",
  "description": "Connect to your self-hosted web scraper API",
  "parameters": [
    {
      "name": "host",
      "type": "url",
      "label": "Scraper API Host",
      "description": "The base URL of your scraper API (e.g., http://localhost:8000)",
      "required": true
    },
    {
      "name": "apikey",
      "type": "text",
      "label": "API Key",
      "description": "Optional API key for authentication",
      "required": false
    }
  ]
}
```

#### 4. Scrape Action Configuration (`scrape.json`)

```json
{
  "name": "scrape",
  "label": "Scrape Website",
  "description": "Extract content from a website URL",
  "parameters": [
    {
      "name": "url",
      "type": "url",
      "label": "Website URL",
      "description": "The URL to scrape content from",
      "required": true
    },
    {
      "name": "include_redirects",
      "type": "boolean",
      "label": "Include Redirect Information",
      "description": "Include redirect chain information in the response",
      "default": false
    },
    {
      "name": "include_meta",
      "type": "boolean",
      "label": "Include Metadata",
      "description": "Include page metadata (description, charset, etc.)",
      "default": true
    }
  ],
  "expect": [
    {
      "name": "success",
      "type": "boolean",
      "label": "Success"
    },
    {
      "name": "url",
      "type": "url",
      "label": "Original URL"
    },
    {
      "name": "final_url",
      "type": "url",
      "label": "Final URL"
    },
    {
      "name": "title",
      "type": "text",
      "label": "Page Title"
    },
    {
      "name": "content",
      "type": "text",
      "label": "Page Content"
    },
    {
      "name": "word_count",
      "type": "number",
      "label": "Word Count"
    },
    {
      "name": "timestamp",
      "type": "date",
      "label": "Scraped At"
    },
    {
      "name": "meta",
      "type": "collection",
      "label": "Metadata",
      "spec": [
        {
          "name": "description",
          "type": "text",
          "label": "Description"
        },
        {
          "name": "charset",
          "type": "text",
          "label": "Character Set"
        },
        {
          "name": "content_type",
          "type": "text",
          "label": "Content Type"
        }
      ]
    },
    {
      "name": "redirects",
      "type": "collection",
      "label": "Redirect Information",
      "spec": [
        {
          "name": "count",
          "type": "number",
          "label": "Redirect Count"
        },
        {
          "name": "followed_redirects",
          "type": "boolean",
          "label": "Followed Redirects"
        }
      ]
    }
  ]
}
```

#### 5. Function Implementation (`functions/scrape.js`)

```javascript
const axios = require('axios');

module.exports = async function(args) {
    const { connection, parameters } = args;
    
    try {
        // Build request URL
        const baseUrl = connection.host.replace(/\/$/, '');
        const scrapeUrl = `${baseUrl}/crawl`;
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (connection.apikey) {
            headers['Authorization'] = `Bearer ${connection.apikey}`;
        }
        
        // Make request to scraper API
        const response = await axios.post(scrapeUrl, {
            url: parameters.url
        }, {
            headers: headers,
            timeout: 60000 // 60 second timeout
        });
        
        const data = response.data;
        
        // Check if scraping was successful
        if (!data.success) {
            throw new Error(data.error || 'Scraping failed');
        }
        
        // Format response for Make.com
        const result = {
            success: data.success,
            url: data.url,
            final_url: data.final_url,
            title: data.title,
            content: data.content,
            word_count: data.word_count,
            timestamp: data.timestamp
        };
        
        // Include metadata if requested
        if (parameters.include_meta && data.meta) {
            result.meta = {
                description: data.meta.description || '',
                charset: data.meta.charset || 'utf-8',
                content_type: data.meta.content_type || 'text/html'
            };
        }
        
        // Include redirect information if requested
        if (parameters.include_redirects && data.redirects) {
            result.redirects = {
                count: data.redirects.count || 0,
                followed_redirects: data.redirects.followed_redirects || false
            };
        }
        
        return result;
        
    } catch (error) {
        // Handle different types of errors
        if (error.response) {
            // HTTP error response
            const status = error.response.status;
            const message = error.response.data?.error || error.response.statusText;
            throw new Error(`HTTP ${status}: ${message}`);
        } else if (error.request) {
            // Network error
            throw new Error('Network error: Unable to reach scraper API');
        } else {
            // Other error
            throw new Error(error.message || 'Unknown error occurred');
        }
    }
};
```

#### 6. Deploy Module

```bash
# Restart Make.com services to load the new module
sudo systemctl restart make-core
sudo systemctl restart make-worker

# Or if using Docker
docker-compose restart make-core make-worker
```

### Adding API Authentication (Optional)

To secure your scraper API with authentication, modify `index.php`:

```php
// Add this after the CORS headers
private function validateApiKey()
{
    $apiKey = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $apiKey = str_replace('Bearer ', '', $apiKey);
    
    // Define your API keys here or load from environment
    $validKeys = [
        'your-secret-api-key-here',
        // Add more keys as needed
    ];
    
    if (!empty($apiKey) && in_array($apiKey, $validKeys)) {
        return true;
    }
    
    // If API key is provided but invalid, reject
    if (!empty($apiKey)) {
        return false;
    }
    
    // Allow requests without API key (for backward compatibility)
    return true;
}

// Add this check in handleCrawl() method
private function handleCrawl()
{
    // Validate API key if provided
    if (!$this->validateApiKey()) {
        http_response_code(401);
        return [
            'success' => false,
            'error' => 'Invalid API key',
            'timestamp' => date('c')
        ];
    }
    
    // ... rest of existing code
}
```

### Environment Configuration

Create a `.env` file for configuration:

```bash
# Web Scraper Configuration
SCRAPER_API_KEYS=key1,key2,key3
SCRAPER_TIMEOUT=60
SCRAPER_MAX_REDIRECTS=10
SCRAPER_USER_AGENT=Make.com Web Scraper Bot 1.0
```

### Using in Make.com Scenarios

Once installed, you can use the module in Make.com scenarios:

1. **Basic Website Scraping**:
   - Trigger: Webhook, Schedule, or other trigger
   - Action: Web Scraper → Scrape Website
   - Input: Website URL
   - Output: Title, content, word count, etc.

2. **Bulk URL Processing**:
   - Trigger: Read CSV file with URLs
   - Iterator: Split URLs
   - Action: Web Scraper → Scrape Website
   - Output: Aggregate results to Google Sheets

3. **Content Monitoring**:
   - Trigger: Schedule (every hour/day)
   - Action: Web Scraper → Scrape Website
   - Filter: Check if content changed
   - Action: Send notification if changed

### Troubleshooting Module Integration

**Module not appearing in Make.com:**
```bash
# Check module syntax
cd /path/to/make/modules/web-scraper
node -c functions/scrape.js

# Check Make.com logs
tail -f /var/log/make/core.log
tail -f /var/log/make/worker.log
```

**Connection errors:**
- Verify the scraper API is accessible from Make.com server
- Check firewall rules and network connectivity
- Test API endpoint manually: `curl http://your-api-host/health`

**Authentication issues:**
- Verify API key configuration
- Check HTTP headers in Make.com connection settings
- Test with and without API key

## Development

### Adding New Crawlers

1. Create a new crawler in `node-crawler/` directory
2. Follow the same interface pattern (URL as first argument, JSON output)
3. Update the crawler path in `index.php`
4. Test with the health check endpoint

### API Extensions

The PHP API supports easy extension through the routing system in the `handleRequest()` method.

### Monitoring

Use the `/health` and `/status` endpoints for monitoring and alerting:

```bash
# Simple uptime check
curl -f http://localhost:8000/health > /dev/null

# Detailed monitoring
curl -s http://localhost:8000/status | jq '.memory_usage'
```

## License

This project is open source. Use responsibly and respect website terms of service and robots.txt files.

## Contributing

When contributing:

1. Test with various websites and content types
2. Ensure proper error handling and cleanup
3. Maintain API compatibility
4. Add tests for new crawlers
5. Update documentation for new features

## Limitations

- Requires Node.js runtime environment
- May be detected by sophisticated anti-bot systems
- Resource intensive due to HTTP requests and parsing
- Limited by server memory and processing power
- Some sites may require additional headers or authentication
- JavaScript-heavy sites may need the Puppeteer crawler (not currently integrated)