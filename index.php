<?php

/**
 * Web Crawler with Browser Session
 * Crawls URLs using headless Chrome to avoid detection
 * Returns clean content as JSON via webhook
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class WebCrawler
{
    private $chromePath;
    private $userDataDir;
    private $timeout = 30;

    public function __construct()
    {
        // Common Chrome installation paths
        $chromePaths = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            'C:\Program Files\Google\Chrome\Application\chrome.exe',
            'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
        ];

        foreach ($chromePaths as $path) {
            if (file_exists($path)) {
                $this->chromePath = $path;
                break;
            }
        }

        if (!$this->chromePath) {
            throw new Exception('Chrome/Chromium not found. Please install Google Chrome or Chromium.');
        }

        $this->userDataDir = sys_get_temp_dir() . '/chrome_user_data_' . uniqid();
    }

    /**
     * Crawl a URL and return clean content
     */
    public function crawl($url, $options = [])
    {
        try {
            // Validate URL
            if (!filter_var($url, FILTER_VALIDATE_URL)) {
                throw new Exception('Invalid URL provided');
            }

            // Create temporary HTML file for the page content
            $tempFile = tempnam(sys_get_temp_dir(), 'crawl_');
            $scriptFile = tempnam(sys_get_temp_dir(), 'script_') . '.js';

            // JavaScript to extract clean content
            $script = $this->generateExtractionScript();
            file_put_contents($scriptFile, $script);

            // Chrome arguments for stealth browsing
            $chromeArgs = [
                '--headless',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--user-data-dir=' . escapeshellarg($this->userDataDir),
                '--user-agent=' . escapeshellarg($this->getRandomUserAgent()),
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--timeout=' . ($this->timeout * 1000)
            ];

            // Build Chrome command
            $command = escapeshellcmd($this->chromePath) . ' ' .
                implode(' ', $chromeArgs) . ' ' .
                '--dump-dom ' . escapeshellarg($url) . ' > ' . escapeshellarg($tempFile) . ' 2>/dev/null';

            // Execute Chrome command
            exec($command, $output, $returnCode);

            if ($returnCode !== 0) {
                throw new Exception('Failed to load page with Chrome');
            }

            // Read the dumped DOM
            $html = file_get_contents($tempFile);
            if (empty($html)) {
                throw new Exception('No content retrieved from URL');
            }

            // Process the HTML to extract clean content
            $cleanContent = $this->extractCleanContent($html);

            // Clean up temporary files
            unlink($tempFile);
            unlink($scriptFile);
            $this->cleanup();

            return [
                'success' => true,
                'url' => $url,
                'title' => $cleanContent['title'],
                'content' => $cleanContent['content'],
                'meta' => $cleanContent['meta'],
                'timestamp' => date('c'),
                'word_count' => str_word_count(strip_tags($cleanContent['content']))
            ];
        } catch (Exception $e) {
            $this->cleanup();
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url ?? null,
                'timestamp' => date('c')
            ];
        }
    }

    /**
     * Extract clean content from HTML
     */
    private function extractCleanContent($html)
    {
        // Create DOMDocument
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);

        // Remove unwanted elements (ads, scripts, etc.)
        $unwantedSelectors = [
            '//script',
            '//style',
            '//noscript',
            '//iframe',
            '//embed',
            '//object',
            '//form',
            '//nav',
            '//header[@class="header"]',
            '//footer',
            '//aside',
            '//*[contains(@class, "ad")]',
            '//*[contains(@class, "advertisement")]',
            '//*[contains(@class, "banner")]',
            '//*[contains(@class, "popup")]',
            '//*[contains(@class, "modal")]',
            '//*[contains(@class, "cookie")]',
            '//*[contains(@class, "social")]',
            '//*[contains(@class, "share")]',
            '//*[contains(@class, "comment")]',
            '//*[contains(@id, "ad")]',
            '//*[contains(@id, "advertisement")]',
            '//*[contains(@id, "sidebar")]',
            '//*[contains(@id, "footer")]',
            '//*[contains(@id, "header")]'
        ];

        foreach ($unwantedSelectors as $selector) {
            $elements = $xpath->query($selector);
            foreach ($elements as $element) {
                if ($element->parentNode) {
                    $element->parentNode->removeChild($element);
                }
            }
        }

        // Extract title
        $titleNodes = $xpath->query('//title');
        $title = $titleNodes->length > 0 ? trim($titleNodes->item(0)->textContent) : '';

        // Extract meta description
        $metaDesc = '';
        $metaNodes = $xpath->query('//meta[@name="description"]/@content');
        if ($metaNodes->length > 0) {
            $metaDesc = $metaNodes->item(0)->textContent;
        }

        // Try to find main content
        $contentSelectors = [
            '//main',
            '//article',
            '//*[contains(@class, "content")]',
            '//*[contains(@class, "post")]',
            '//*[contains(@class, "article")]',
            '//*[contains(@id, "content")]',
            '//*[contains(@id, "main")]',
            '//div[@class="entry-content"]',
            '//div[@class="post-content"]'
        ];

        $mainContent = '';
        foreach ($contentSelectors as $selector) {
            $elements = $xpath->query($selector);
            if ($elements->length > 0) {
                $element = $elements->item(0);
                $mainContent = $this->getInnerHTML($element);
                break;
            }
        }

        // Fallback: get body content if no main content found
        if (empty($mainContent)) {
            $bodyNodes = $xpath->query('//body');
            if ($bodyNodes->length > 0) {
                $mainContent = $this->getInnerHTML($bodyNodes->item(0));
            }
        }

        // Clean up the content
        $mainContent = $this->cleanContent($mainContent);

        return [
            'title' => $title,
            'content' => $mainContent,
            'meta' => [
                'description' => $metaDesc,
                'url' => $_POST['url'] ?? $_GET['url'] ?? ''
            ]
        ];
    }

    /**
     * Get inner HTML of a DOM element
     */
    private function getInnerHTML($element)
    {
        $innerHTML = '';
        $children = $element->childNodes;
        foreach ($children as $child) {
            $innerHTML .= $element->ownerDocument->saveHTML($child);
        }
        return $innerHTML;
    }

    /**
     * Clean content by removing extra whitespace and empty elements
     */
    private function cleanContent($content)
    {
        // Remove excessive whitespace
        $content = preg_replace('/\s+/', ' ', $content);
        $content = preg_replace('/>\s+</', '><', $content);

        // Remove empty paragraphs and divs
        $content = preg_replace('/<(p|div|span)[^>]*>\s*<\/\1>/', '', $content);

        return trim($content);
    }

    /**
     * Generate JavaScript for content extraction
     */
    private function generateExtractionScript()
    {
        return "
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'iframe', 'embed', 'object',
            '.ad', '.advertisement', '.banner', '.popup', '.modal',
            '#ad', '#advertisement', '#sidebar', 'nav', 'footer'
        ];
        
        unwantedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Return cleaned HTML
        console.log(document.documentElement.outerHTML);
        ";
    }

    /**
     * Get random user agent to avoid detection
     */
    private function getRandomUserAgent()
    {
        $userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0'
        ];

        return $userAgents[array_rand($userAgents)];
    }

    /**
     * Clean up temporary files and directories
     */
    private function cleanup()
    {
        if (is_dir($this->userDataDir)) {
            $this->deleteDirectory($this->userDataDir);
        }
    }

    /**
     * Recursively delete directory
     */
    private function deleteDirectory($dir)
    {
        if (!is_dir($dir)) return;

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }
}

// Main webhook handler
try {
    // Get URL from POST or GET request
    $url = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $url = $input['url'] ?? $_POST['url'] ?? '';
    } else {
        $url = $_GET['url'] ?? '';
    }

    if (empty($url)) {
        throw new Exception('URL parameter is required');
    }

    // Initialize crawler and process URL
    $crawler = new WebCrawler();
    $result = $crawler->crawl($url);

    // Return JSON response
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
}
