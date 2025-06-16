const puppeteer = require('puppeteer');

class BasicCrawler {
    constructor() {
        this.browser = null;
    }

    async initialize() {
        const outputJson = process.argv.includes('--json');

        try {
            if (!outputJson) console.log('Initializing browser...');

            // Try to find Chrome executable
            const fs = require('fs');
            const path = require('path');

            let executablePath = null;

            // First try to use Puppeteer's default path
            try {
                executablePath = puppeteer.executablePath();
                if (fs.existsSync(executablePath)) {
                    if (!outputJson) console.log(`Using Puppeteer default Chrome at: ${executablePath}`);
                } else {
                    executablePath = null;
                }
            } catch (e) {
                // Puppeteer couldn't find default path
            }

            // If default doesn't work, try common locations
            if (!executablePath) {
                const possiblePaths = [
                    '/home/ubuntu/.cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome',
                    '/var/www/.cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome'
                ];

                // Also dynamically search for Chrome
                try {
                    const { execSync } = require('child_process');
                    const findResult = execSync('find /home/ubuntu/.cache/puppeteer -name "chrome" -type f 2>/dev/null || find /var/www/.cache/puppeteer -name "chrome" -type f 2>/dev/null', { encoding: 'utf8' });
                    if (findResult.trim()) {
                        possiblePaths.unshift(findResult.trim().split('\n')[0]);
                    }
                } catch (e) {
                    // find command failed, continue with predefined paths
                }

                for (const chromePath of possiblePaths) {
                    if (fs.existsSync(chromePath)) {
                        executablePath = chromePath;
                        if (!outputJson) console.log(`Found Chrome at: ${chromePath}`);
                        break;
                    }
                }
            }

            const launchOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            };

            // Add executable path if we found one
            if (executablePath) {
                launchOptions.executablePath = executablePath;
            }

            this.browser = await puppeteer.launch(launchOptions);
            if (!outputJson) console.log('Browser initialized successfully');
            return true;
        } catch (error) {
            if (!outputJson) console.error('Failed to initialize browser:', error.message);
            return false;
        }
    }

    async crawlUrl(url) {
        if (!this.browser) {
            throw new Error('Browser not initialized. Call initialize() first.');
        }

        const outputJson = process.argv.includes('--json');
        let page = null;
        const startTime = Date.now();

        try {
            if (!outputJson) console.log(`Starting crawl of: ${url}`);

            page = await this.browser.newPage();

            // Set more realistic viewport and user agent to avoid detection
            await page.setViewport({ width: 1366, height: 768 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Set additional headers to look more like a real browser
            await page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            });

            // Set request interception to block images/fonts for faster loading
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Navigate to URL with timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait a bit for any dynamic content
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if we're blocked by CAPTCHA or bot detection
            const isBlocked = await page.evaluate(() => {
                const blockedIndicators = [
                    'captcha', 'bot detection', 'access denied', 'blocked',
                    'security check', 'verify you are human', 'cloudflare'
                ];

                const pageText = document.body.textContent.toLowerCase();
                const title = document.title.toLowerCase();

                return blockedIndicators.some(indicator =>
                    pageText.includes(indicator) || title.includes(indicator)
                ) || document.querySelector('iframe[title*="CAPTCHA"]') !== null;
            });

            if (isBlocked) {
                return {
                    success: false,
                    error: 'Access blocked by website (CAPTCHA/bot detection)',
                    url: url,
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime
                };
            }

            // Extract page data with clean text content
            const pageData = await page.evaluate(() => {
                // Helper function for safe property access (replaces optional chaining)
                const safeGet = (obj, prop) => obj && obj[prop] ? obj[prop] : '';

                // Function to remove header/footer/navigation content
                const removeHeaderFooterContent = () => {
                    // Common selectors for headers, footers, and navigation
                    const selectorsToRemove = [
                        'header', 'footer', 'nav',
                        '.header', '.footer', '.navigation', '.nav',
                        '#header', '#footer', '#navigation', '#nav',
                        '.site-header', '.site-footer', '.main-nav',
                        '.top-bar', '.bottom-bar', '.sidebar',
                        '.cookie-banner', '.cookie-notice',
                        '.advertisement', '.ads', '.ad',
                        '.social-share', '.share-buttons',
                        '.related-articles', '.recommended',
                        '.comments', '.comment-section',
                        '.breadcrumb', '.breadcrumbs',
                        '.menu', '.dropdown-menu',
                        // News site specific
                        '.byline', '.author-info', '.publish-date',
                        '.tags', '.categories', '.newsletter-signup',
                        '.subscription-banner', '.paywall',
                        // Social media and sharing
                        '.facebook', '.twitter', '.linkedin', '.pinterest',
                        '.social-media', '.share-tools',
                        'script', 'style', 'noscript'
                    ];

                    // Remove elements
                    selectorsToRemove.forEach(selector => {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => el.remove());
                    });

                    // Remove elements by text content patterns
                    const textPatternsToRemove = [
                        /subscribe/i, /newsletter/i, /advertisement/i,
                        /cookie/i, /privacy policy/i, /terms of service/i,
                        /follow us/i, /share this/i
                    ];

                    const allElements = document.querySelectorAll('*');
                    allElements.forEach(el => {
                        const text = el.textContent.toLowerCase();
                        if (textPatternsToRemove.some(pattern => pattern.test(text)) && text.length < 100) {
                            el.remove();
                        }
                    });
                };

                // Function to extract clean text content
                const extractCleanText = () => {
                    // First remove unwanted elements
                    removeHeaderFooterContent();

                    // Try to find main content area first
                    const mainContentSelectors = [
                        'main', 'article', '.main-content', '.content',
                        '#main', '#content', '#article',
                        '.post-content', '.entry-content', '.article-content',
                        '.story-body', '.article-body', '.post-body'
                    ];

                    let mainContent = null;
                    for (const selector of mainContentSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            mainContent = element;
                            break;
                        }
                    }

                    // If no main content found, use body but filter more aggressively
                    const contentSource = mainContent || document.body;

                    if (!contentSource) return '';

                    // Get text content and clean it up
                    let text = contentSource.innerText || contentSource.textContent || '';

                    // Clean up the text
                    text = text
                        // Remove multiple whitespace and newlines
                        .replace(/\s+/g, ' ')
                        // Remove excessive line breaks
                        .replace(/\n\s*\n/g, '\n')
                        // Trim whitespace
                        .trim();

                    return text;
                };

                // Extract headings for structure
                const extractHeadings = () => {
                    const headingSelectors = [
                        'main h1, main h2, main h3',
                        'article h1, article h2, article h3',
                        '.content h1, .content h2, .content h3',
                        '.post-content h1, .post-content h2, .post-content h3'
                    ];

                    let headings = [];
                    for (const selector of headingSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            headings = Array.from(elements).map(h => ({
                                tag: h.tagName.toLowerCase(),
                                text: h.textContent.trim()
                            }));
                            break;
                        }
                    }

                    return headings;
                };

                const cleanText = extractCleanText();

                return {
                    title: document.title,
                    url: window.location.href,
                    textContent: cleanText,
                    headings: extractHeadings(),
                    wordCount: cleanText.split(' ').filter(word => word.length > 0).length,
                    meta: {
                        description: safeGet(document.querySelector('meta[name="description"]'), 'content') || '',
                        keywords: safeGet(document.querySelector('meta[name="keywords"]'), 'content') || '',
                        author: safeGet(document.querySelector('meta[name="author"]'), 'content') || ''
                    }
                };
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            if (!outputJson) console.log(`Successfully crawled: ${url} (${duration}ms)`);

            return {
                success: true,
                url: url,
                timestamp: new Date().toISOString(),
                duration: duration,
                ...pageData
            };

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            if (!outputJson) console.error(`Failed to crawl ${url}:`, error.message);

            return {
                success: false,
                error: error.message,
                url: url,
                timestamp: new Date().toISOString(),
                duration: duration
            };
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    async crawlMultipleUrls(urls, options = {}) {
        const { concurrent = 3, delay = 1000 } = options;
        const results = [];
        const outputJson = process.argv.includes('--json');

        if (!outputJson) console.log(`Starting crawl of ${urls.length} URLs with concurrency: ${concurrent}`);

        // Process URLs in batches
        for (let i = 0; i < urls.length; i += concurrent) {
            const batch = urls.slice(i, i + concurrent);

            if (!outputJson) console.log(`Processing batch ${Math.floor(i / concurrent) + 1}/${Math.ceil(urls.length / concurrent)}`);

            const batchPromises = batch.map(url => this.crawlUrl(url));
            const batchResults = await Promise.allSettled(batchPromises);

            // Process results
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({
                        success: false,
                        error: result.reason.message,
                        url: batch[index],
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Delay between batches
            if (i + concurrent < urls.length && delay > 0) {
                if (!outputJson) console.log(`Waiting ${delay}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }

    async close() {
        const outputJson = process.argv.includes('--json');
        if (this.browser) {
            if (!outputJson) console.log('Closing browser...');
            await this.browser.close();
            this.browser = null;
            if (!outputJson) console.log('Browser closed');
        }
    }
}

// Usage example and CLI interface
async function main() {
    const crawler = new BasicCrawler();

    // Get URLs from command line arguments or use defaults
    const args = process.argv.slice(2);
    let urls = [];
    let outputJson = false;

    // Check if called with --json flag (for PHP integration)
    if (args.includes('--json')) {
        outputJson = true;
        args.splice(args.indexOf('--json'), 1);
    }

    if (args.length > 0) {
        urls = args;
    } else {
        // Default test URLs
        urls = [
            'https://www.google.com',
            'https://www.github.com',
            'https://www.stackoverflow.com'
        ];
        if (!outputJson) {
            console.log('No URLs provided, using default test URLs');
        }
    }

    try {
        // Initialize crawler
        const initialized = await crawler.initialize();
        if (!initialized) {
            if (outputJson) {
                console.log(JSON.stringify({
                    success: false,
                    error: 'Failed to initialize crawler',
                    timestamp: new Date().toISOString()
                }));
            } else {
                console.error('Failed to initialize crawler');
            }
            process.exit(1);
        }

        // For single URL (PHP integration), crawl just one
        if (urls.length === 1 && outputJson) {
            const result = await crawler.crawlUrl(urls[0]);
            console.log(JSON.stringify(result, null, 2));
        } else {
            // Crawl multiple URLs
            const results = await crawler.crawlMultipleUrls(urls, {
                concurrent: 2,
                delay: 2000
            });

            if (outputJson) {
                // Output JSON for PHP
                console.log(JSON.stringify({
                    success: true,
                    results: results,
                    summary: {
                        total: results.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length
                    },
                    timestamp: new Date().toISOString()
                }, null, 2));
            } else {
                // Output human-readable format
                console.log('\n=== CRAWL RESULTS ===');
                results.forEach((result, index) => {
                    console.log(`\n${index + 1}. ${result.url}`);
                    console.log(`   Success: ${result.success}`);
                    if (result.success) {
                        console.log(`   Title: ${result.title}`);
                        console.log(`   Duration: ${result.duration}ms`);
                        console.log(`   Content Length: ${result.content?.length || 0} chars`);
                        console.log(`   Headings: ${result.headings?.length || 0}`);
                        console.log(`   Links: ${result.links?.length || 0}`);
                    } else {
                        console.log(`   Error: ${result.error}`);
                    }
                });

                // Summary
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                console.log(`\n=== SUMMARY ===`);
                console.log(`Total URLs: ${results.length}`);
                console.log(`Successful: ${successful}`);
                console.log(`Failed: ${failed}`);
            }
        }

    } catch (error) {
        if (outputJson) {
            console.log(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }));
        } else {
            console.error('Crawler error:', error);
        }
    } finally {
        await crawler.close();
    }
}

// Export for use as module
module.exports = BasicCrawler;

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}