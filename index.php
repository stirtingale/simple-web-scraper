<?php

/**
 * Web Scraper API
 * Main entry point for the web scraping service
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// API Documentation and routing
class ScraperAPI
{
    private $version = '1.0.0';

    public function __construct()
    {
        // Constructor
    }

    public function handleRequest()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_SERVER['REQUEST_URI'];
        $parsedUrl = parse_url($path);
        $route = $parsedUrl['path'] ?? '/';

        // Get query parameters
        $queryParams = [];
        if (isset($parsedUrl['query'])) {
            parse_str($parsedUrl['query'], $queryParams);
        }

        // If there's a 'url' parameter, treat it as a crawl request regardless of path
        if (isset($queryParams['url']) || isset($_POST['url']) || $this->hasJsonUrl()) {
            return $this->handleCrawl();
        }

        // Remove base path if needed for clean routing
        $route = str_replace('/scrape', '', $route);
        if ($route === '') $route = '/';

        switch ($route) {
            case '/':
            case '/index.php':
                return $this->showDocs();

            case '/crawl':
                return $this->handleCrawl();

            case '/health':
                return $this->healthCheck();

            case '/status':
                return $this->getStatus();

            default:
                return $this->notFound();
        }
    }

    private function hasJsonUrl()
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            return isset($input['url']);
        }
        return false;
    }

    private function showDocs()
    {
        $baseUrl = $this->getBaseUrl();

        return [
            'name' => 'Web Scraper API',
            'version' => $this->version,
            'description' => 'A web scraping service that extracts clean content from web pages',
            'endpoints' => [
                'GET /' => 'This documentation',
                'GET /health' => 'Health check endpoint',
                'GET /status' => 'System status and configuration',
                'POST /crawl' => 'Scrape a website',
                'GET /crawl' => 'Scrape a website (GET method)'
            ],
            'usage' => [
                'post_example' => [
                    'url' => $baseUrl . '/crawl',
                    'method' => 'POST',
                    'headers' => [
                        'Content-Type' => 'application/json'
                    ],
                    'body' => [
                        'url' => 'https://example.com'
                    ]
                ],
                'get_example' => [
                    'url' => $baseUrl . '?url=https://example.com',
                    'method' => 'GET'
                ]
            ],
            'response_format' => [
                'success' => true,
                'url' => 'https://example.com',
                'title' => 'Page Title',
                'content' => '<p>Clean HTML content...</p>',
                'meta' => [
                    'description' => 'Page meta description',
                    'url' => 'https://example.com'
                ],
                'timestamp' => '2025-06-16T12:00:00.000Z',
                'word_count' => 1234
            ],
            'features' => [
                'Browser-like crawling with realistic headers',
                'Automatic ad and unwanted content removal',
                'Clean HTML markup extraction',
                'Meta information extraction',
                'Word count analysis',
                'JSON response format',
                'CORS support'
            ],
            'timestamp' => date('c')
        ];
    }

    private function handleCrawl()
    {
        // Get URL from request
        $url = '';
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $url = $input['url'] ?? $_POST['url'] ?? '';
        } else {
            $url = $_GET['url'] ?? '';
        }

        if (empty($url)) {
            return [
                'success' => false,
                'error' => 'URL parameter is required',
                'timestamp' => date('c')
            ];
        }

        // Call the Node.js crawler directly
        return $this->callNodeCrawler($url);
    }

    private function callNodeCrawler($url)
    {
        try {
            // Path to the Node.js crawler script
            $nodeCrawlerPath = __DIR__ . '/node-crawler/basic-crawler.js';

            // Check if Node.js crawler exists
            if (!file_exists($nodeCrawlerPath)) {
                return [
                    'success' => false,
                    'error' => 'Node.js crawler script not found at: ' . $nodeCrawlerPath,
                    'timestamp' => date('c')
                ];
            }

            // Validate URL
            if (!filter_var($url, FILTER_VALIDATE_URL)) {
                return [
                    'success' => false,
                    'error' => 'Invalid URL provided',
                    'timestamp' => date('c')
                ];
            }

            // Escape the URL for shell execution
            $escapedUrl = escapeshellarg($url);

            // Build the command
            $nodeDir = dirname($nodeCrawlerPath);
            $scriptName = basename($nodeCrawlerPath);

            $command = "cd " . escapeshellarg($nodeDir) . " && " .
                "timeout 60 node " . escapeshellarg($scriptName) . " {$escapedUrl} 2>&1";

            // Execute the Node.js crawler
            $output = shell_exec($command);

            if (empty($output)) {
                return [
                    'success' => false,
                    'error' => 'No output from Node.js crawler. Command may have timed out or failed.',
                    'timestamp' => date('c')
                ];
            }

            // Parse JSON response
            $result = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return [
                    'success' => false,
                    'error' => 'Invalid JSON response from Node.js crawler',
                    'raw_output' => substr($output, 0, 500),
                    'timestamp' => date('c')
                ];
            }

            return $result;
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url,
                'timestamp' => date('c')
            ];
        }
    }

    private function healthCheck()
    {
        $checks = [];

        // Check if Node.js is available
        $nodeVersion = trim(shell_exec('node --version 2>/dev/null') ?: '');
        $checks['node_available'] = !empty($nodeVersion);
        $checks['node_version'] = $nodeVersion ?: 'Not found';

        // Check if npm is available
        $npmVersion = trim(shell_exec('npm --version 2>/dev/null') ?: '');
        $checks['npm_available'] = !empty($npmVersion);
        $checks['npm_version'] = $npmVersion ?: 'Not found';

        // Check if crawler dependencies exist
        $nodeCrawlerPath = __DIR__ . '/node-crawler/basic-crawler.js';
        $checks['node_crawler_exists'] = file_exists($nodeCrawlerPath);

        // Check if package.json exists
        $packageJsonPath = __DIR__ . '/node-crawler/package.json';
        $checks['package_json_exists'] = file_exists($packageJsonPath);

        // Overall health
        $healthy = $checks['node_available'] &&
            $checks['node_crawler_exists'] &&
            $checks['package_json_exists'];

        return [
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'checks' => $checks,
            'timestamp' => date('c')
        ];
    }

    private function getStatus()
    {
        return [
            'service' => 'Web Scraper API',
            'version' => $this->version,
            'php_version' => PHP_VERSION,
            'server_time' => date('c'),
            'uptime' => $this->getUptime(),
            'memory_usage' => [
                'current' => memory_get_usage(true),
                'peak' => memory_get_peak_usage(true),
                'limit' => ini_get('memory_limit')
            ],
            'system_info' => [
                'os' => php_uname(),
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
            ]
        ];
    }

    private function notFound()
    {
        http_response_code(404);
        return [
            'success' => false,
            'error' => 'Endpoint not found',
            'available_endpoints' => [
                'GET /' => 'API documentation',
                'GET /health' => 'Health check',
                'GET /status' => 'System status',
                'POST /crawl' => 'Scrape website',
                'GET /crawl' => 'Scrape website'
            ],
            'timestamp' => date('c')
        ];
    }

    private function getBaseUrl()
    {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $path = dirname($_SERVER['REQUEST_URI']);
        return $protocol . '://' . $host . $path;
    }

    private function getUptime()
    {
        $uptime = shell_exec('uptime -p 2>/dev/null');
        return $uptime ? trim($uptime) : 'Unknown';
    }
}

// Handle the request
try {
    $api = new ScraperAPI();
    $response = $api->handleRequest();

    // Set appropriate HTTP status if it's an error
    if (isset($response['success']) && $response['success'] === false) {
        if (!headers_sent()) {
            http_response_code(400);
        }
    }

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
}
