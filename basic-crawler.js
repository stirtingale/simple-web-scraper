const puppeteer = require('puppeteer');

class AdvancedCrawler {
    constructor() {
        this.browser = null;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async initialize() {
        const outputJson = process.argv.includes('--json');

        try {
            if (!outputJson) console.log('Initializing stealth browser...');

            // Enhanced stealth configuration
            const launchOptions = {
                headless: 'new', // Use new headless mode
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    // Additional stealth args
                    '--disable-blink-features=AutomationControlled',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-client-side-phishing-detection',
                    '--disable-default-apps',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-features=TranslateUI',
                    '--disable-hang-monitor',
                    '--disable-ipc-flooding-protection',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-renderer-backgrounding',
                    '--disable-sync',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    '--hide-scrollbars',
                    '--mute-audio'
                ],
                ignoreHTTPSErrors: true,
                ignoreDefaultArgs: ['--enable-automation']
            };

            // Try to find Chrome executable (your existing logic)
            const fs = require('fs');
            let executablePath = null;

            try {
                executablePath = puppeteer.executablePath();
                if (fs.existsSync(executablePath)) {
                    if (!outputJson) console.log(`Using Puppeteer default Chrome at: ${executablePath}`);
                } else {
                    executablePath = null;
                }
            } catch (e) {
                // Continue with search
            }

            if (!executablePath) {
                const possiblePaths = [
                    '/home/ubuntu/.cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome',
                    '/var/www/.cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome'
                ];

                try {
                    const { execSync } = require('child_process');
                    const findResult = execSync('find /home/ubuntu/.cache/puppeteer -name "chrome" -type f 2>/dev/null || find /var/www/.cache/puppeteer -name "chrome" -type f 2>/dev/null', { encoding: 'utf8' });
                    if (findResult.trim()) {
                        possiblePaths.unshift(findResult.trim().split('\n')[0]);
                    }
                } catch (e) {
                    // Continue
                }

                for (const chromePath of possiblePaths) {
                    if (fs.existsSync(chromePath)) {
                        executablePath = chromePath;
                        if (!outputJson) console.log(`Found Chrome at: ${chromePath}`);
                        break;
                    }
                }
            }

            if (executablePath) {
                launchOptions.executablePath = executablePath;
            }

            this.browser = await puppeteer.launch(launchOptions);
            if (!outputJson) console.log('Stealth browser initialized successfully');
            return true;
        } catch (error) {
            if (!outputJson) console.error('Failed to initialize browser:', error.message);
            return false;
        }
    }

    async createStealthPage() {
        const page = await this.browser.newPage();

        // Set random viewport
        const viewports = [
            { width: 1366, height: 768 },
            { width: 1920, height: 1080 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 }
        ];
        const viewport = viewports[Math.floor(Math.random() * viewports.length)];
        await page.setViewport(viewport);

        // Set random user agent
        await page.setUserAgent(this.getRandomUserAgent());

        // Remove webdriver traces
        await page.evaluateOnNewDocument(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Mock chrome runtime
            window.chrome = {
                runtime: {}
            };

            // Override toString methods
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter(parameter);
            };
        });

        // Set realistic headers
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        });

        return page;
    }

    async crawlUrl(url, maxRetries = 3) {
        if (!this.browser) {
            throw new Error('Browser not initialized. Call initialize() first.');
        }

        const outputJson = process.argv.includes('--json');
        let page = null;
        const startTime = Date.now();

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!outputJson) console.log(`Crawling ${url} (attempt ${attempt}/${maxRetries})`);

                page = await this.createStealthPage();

                // Add random delay before navigation
                await this.randomDelay(500, 2000);

                // Navigate with extended timeout and better waiting strategy
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 45000
                });

                // Wait for initial content
                await this.randomDelay(2000, 4000);

                // Check for bot detection early
                const detectionCheck = await page.evaluate(() => {
                    const text = document.body.textContent.toLowerCase();
                    const title = document.title.toLowerCase();

                    const blockedKeywords = [
                        'captcha', 'recaptcha', 'bot detection', 'access denied',
                        'blocked', 'security check', 'verify you are human',
                        'cloudflare', 'just a moment', 'please wait', 'checking browser'
                    ];

                    const isBlocked = blockedKeywords.some(keyword =>
                        text.includes(keyword) || title.includes(keyword)
                    );

                    const hasCaptcha = !!(
                        document.querySelector('iframe[src*="recaptcha"]') ||
                        document.querySelector('.g-recaptcha') ||
                        document.querySelector('[data-captcha]') ||
                        document.querySelector('.captcha') ||
                        document.querySelector('.cf-challenge-form')
                    );

                    return {
                        blocked: isBlocked || hasCaptcha,
                        title: document.title,
                        url: window.location.href,
                        hasContent: document.body.textContent.trim().length > 100
                    };
                });

                if (detectionCheck.blocked) {
                    await page.close();
                    if (attempt < maxRetries) {
                        if (!outputJson) console.log(`Bot detection on attempt ${attempt}, retrying...`);
                        await this.randomDelay(5000, 10000); // Longer delay before retry
                        continue;
                    } else {
                        return {
                            success: false,
                            error: 'Access blocked by website (CAPTCHA/bot detection)',
                            url: url,
                            timestamp: new Date().toISOString(),
                            duration: Date.now() - startTime
                        };
                    }
                }

                if (!detectionCheck.hasContent) {
                    await page.close();
                    if (attempt < maxRetries) {
                        if (!outputJson) console.log(`No content loaded on attempt ${attempt}, retrying...`);
                        await this.randomDelay(3000, 6000);
                        continue;
                    }
                }

                // Wait for additional content to load
                try {
                    await page.waitForSelector('body', { timeout: 5000 });
                    await this.randomDelay(1000, 2000);
                } catch (e) {
                    // Continue if selector wait fails
                }

                // Extract page data
                const pageData = await page.evaluate(() => {
                    const safeGet = (obj, prop) => obj && obj[prop] ? obj[prop] : '';

                    const removeUnwantedElements = () => {
                        const selectorsToRemove = [
                            'script', 'style', 'noscript', 'iframe',
                            'header', 'footer', 'nav', '.nav', '.navigation',
                            '.cookie-banner', '.cookie-notice', '.advertisement', '.ads',
                            '.social-share', '.share-buttons', '.sidebar'
                        ];

                        selectorsToRemove.forEach(selector => {
                            document.querySelectorAll(selector).forEach(el => el.remove());
                        });
                    };

                    const extractMainContent = () => {
                        removeUnwantedElements();

                        const mainSelectors = [
                            'main', 'article', '[role="main"]',
                            '.main-content', '.content', '.post-content',
                            '.entry-content', '.article-content', '.story-body'
                        ];

                        let mainContent = null;
                        for (const selector of mainSelectors) {
                            const element = document.querySelector(selector);
                            if (element && element.textContent.trim().length > 200) {
                                mainContent = element;
                                break;
                            }
                        }

                        const contentSource = mainContent || document.body;
                        let text = contentSource.textContent || '';

                        return text.replace(/\s+/g, ' ').trim();
                    };

                    const extractHeadings = () => {
                        return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                            .map(h => ({
                                tag: h.tagName.toLowerCase(),
                                text: h.textContent.trim()
                            }))
                            .filter(h => h.text.length > 0)
                            .slice(0, 10); // Limit to first 10 headings
                    };

                    const extractLinks = () => {
                        return Array.from(document.querySelectorAll('a[href]'))
                            .map(a => a.href)
                            .filter(href => href.startsWith('http'))
                            .slice(0, 20); // Limit to first 20 links
                    };

                    const cleanText = extractMainContent();

                    return {
                        title: document.title,
                        url: window.location.href,
                        textContent: cleanText.substring(0, 10000), // Limit content length
                        headings: extractHeadings(),
                        links: extractLinks(),
                        wordCount: cleanText.split(' ').filter(word => word.length > 0).length,
                        meta: {
                            description: safeGet(document.querySelector('meta[name="description"]'), 'content'),
                            keywords: safeGet(document.querySelector('meta[name="keywords"]'), 'content'),
                            author: safeGet(document.querySelector('meta[name="author"]'), 'content')
                        }
                    };
                });

                await page.close();

                const duration = Date.now() - startTime;
                if (!outputJson) console.log(`Successfully crawled: ${url} (${duration}ms)`);

                return {
                    success: true,
                    url: url,
                    timestamp: new Date().toISOString(),
                    duration: duration,
                    ...pageData
                };

            } catch (error) {
                if (page) await page.close();

                if (attempt < maxRetries) {
                    if (!outputJson) console.log(`Error on attempt ${attempt}: ${error.message}, retrying...`);
                    await this.randomDelay(3000, 7000);
                    continue;
                } else {
                    const duration = Date.now() - startTime;
                    if (!outputJson) console.error(`Failed to crawl ${url} after ${maxRetries} attempts:`, error.message);

                    return {
                        success: false,
                        error: error.message,
                        url: url,
                        timestamp: new Date().toISOString(),
                        duration: duration
                    };
                }
            }
        }
    }

    async crawlMultipleUrls(urls, options = {}) {
        const { concurrent = 2, delay = 3000 } = options; // Reduced concurrency, increased delay
        const results = [];
        const outputJson = process.argv.includes('--json');

        if (!outputJson) console.log(`Starting crawl of ${urls.length} URLs with concurrency: ${concurrent}`);

        // Process URLs in smaller batches with longer delays
        for (let i = 0; i < urls.length; i += concurrent) {
            const batch = urls.slice(i, i + concurrent);

            if (!outputJson) console.log(`Processing batch ${Math.floor(i / concurrent) + 1}/${Math.ceil(urls.length / concurrent)}`);

            const batchPromises = batch.map(url => this.crawlUrl(url));
            const batchResults = await Promise.allSettled(batchPromises);

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

            // Longer delay between batches
            if (i + concurrent < urls.length && delay > 0) {
                if (!outputJson) console.log(`Waiting ${delay}ms before next batch...`);
                await this.randomDelay(delay, delay * 1.5);
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

// Main function (keeping your existing CLI interface)
async function main() {
    const crawler = new AdvancedCrawler();
    const args = process.argv.slice(2);
    let urls = [];
    let outputJson = false;

    if (args.includes('--json')) {
        outputJson = true;
        args.splice(args.indexOf('--json'), 1);
    }

    if (args.length > 0) {
        urls = args;
    } else {
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

        if (urls.length === 1 && outputJson) {
            const result = await crawler.crawlUrl(urls[0]);
            console.log(JSON.stringify(result, null, 2));
        } else {
            const results = await crawler.crawlMultipleUrls(urls, {
                concurrent: 1, // Even more conservative
                delay: 5000    // Longer delays
            });

            if (outputJson) {
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
                console.log('\n=== CRAWL RESULTS ===');
                results.forEach((result, index) => {
                    console.log(`\n${index + 1}. ${result.url}`);
                    console.log(`   Success: ${result.success}`);
                    if (result.success) {
                        console.log(`   Title: ${result.title}`);
                        console.log(`   Duration: ${result.duration}ms`);
                        console.log(`   Word Count: ${result.wordCount}`);
                        console.log(`   Headings: ${result.headings?.length || 0}`);
                        console.log(`   Links: ${result.links?.length || 0}`);
                    } else {
                        console.log(`   Error: ${result.error}`);
                    }
                });

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

module.exports = AdvancedCrawler;

if (require.main === module) {
    main().catch(console.error);
}