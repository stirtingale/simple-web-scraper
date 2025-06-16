#!/usr/bin/env node

const axios = require('axios');

class BasicCrawler {
    constructor() {
        this.timeout = 30000;
        this.maxRedirects = 10; // Follow up to 10 redirects
    }

    async crawl(url) {
        try {
            // Configure axios to follow redirects
            const response = await axios.get(url, {
                timeout: this.timeout,
                maxRedirects: this.maxRedirects,
                validateStatus: function (status) {
                    // Accept any status code less than 500
                    return status < 500;
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache'
                }
            });

            // Get final URL after redirects
            const finalUrl = response.request.res.responseUrl || url;
            const html = response.data;

            // Basic HTML parsing using regex
            const cleanContent = this.parseHtml(html);

            // Track redirect information
            const redirectInfo = this.getRedirectInfo(response);

            return {
                success: true,
                url: url,
                final_url: finalUrl,
                redirects: redirectInfo,
                status_code: response.status,
                title: cleanContent.title,
                content: cleanContent.content,
                meta: {
                    description: cleanContent.description,
                    url: finalUrl,
                    charset: this.extractCharset(html),
                    content_type: response.headers['content-type'] || 'text/html'
                },
                timestamp: new Date().toISOString(),
                word_count: this.countWords(cleanContent.content)
            };

        } catch (error) {
            // Handle different types of errors
            let errorMessage = error.message;
            let statusCode = null;
            let finalUrl = url;

            if (error.response) {
                // The request was made and the server responded with a status code
                statusCode = error.response.status;
                finalUrl = error.response.request.res.responseUrl || url;
                errorMessage = `HTTP ${statusCode}: ${error.response.statusText}`;
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'No response received from server';
            }

            return {
                success: false,
                error: errorMessage,
                url: url,
                final_url: finalUrl,
                status_code: statusCode,
                timestamp: new Date().toISOString()
            };
        }
    }

    getRedirectInfo(response) {
        const redirects = [];

        // Try to get redirect history from axios
        if (response.request && response.request._redirectable && response.request._redirectable._redirects) {
            const redirectHistory = response.request._redirectable._redirects;
            for (let i = 0; i < redirectHistory.length; i++) {
                redirects.push({
                    from: i === 0 ? response.config.url : redirectHistory[i - 1].url,
                    to: redirectHistory[i].url,
                    status: redirectHistory[i].statusCode || 'unknown'
                });
            }
        }

        return {
            count: redirects.length,
            chain: redirects,
            followed_redirects: redirects.length > 0
        };
    }

    extractCharset(html) {
        // Extract charset from meta tags
        const charsetMatch = html.match(/<meta[^>]*charset\s*=\s*['"]\s*([^'"]+)\s*['"]/i) ||
            html.match(/<meta[^>]*content\s*=\s*['"]\s*[^>]*charset\s*=\s*([^'";\s]+)/i);
        return charsetMatch ? charsetMatch[1].trim() : 'utf-8';
    }

    parseHtml(html) {
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : '';

        // Extract meta description
        const metaMatch = html.match(/<meta[^>]*name\s*=\s*['"]\s*description\s*['"][^>]*content\s*=\s*['"]\s*([^'"]+)\s*['"]/i);
        const description = metaMatch ? this.decodeHtml(metaMatch[1].trim()) : '';

        // Remove unwanted elements BEFORE extracting content
        let content = html;

        // Remove scripts, styles, and other non-content elements
        const elementsToRemove = [
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /<style[^>]*>[\s\S]*?<\/style>/gi,
            /<noscript[^>]*>[\s\S]*?<\/noscript>/gi,
            /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
            /<embed[^>]*>[\s\S]*?<\/embed>/gi,
            /<object[^>]*>[\s\S]*?<\/object>/gi,
            /<form[^>]*>[\s\S]*?<\/form>/gi,
            /<svg[^>]*>[\s\S]*?<\/svg>/gi,

            // Remove structural elements
            /<header[^>]*>[\s\S]*?<\/header>/gi,
            /<footer[^>]*>[\s\S]*?<\/footer>/gi,
            /<nav[^>]*>[\s\S]*?<\/nav>/gi,
            /<aside[^>]*>[\s\S]*?<\/aside>/gi,

            // Remove common ad/widget containers
            /<div[^>]*class\s*=\s*[^>]*\b(ad|ads|advertisement|banner|popup|modal|cookie|social|share|comment|sidebar|widget|menu)\b[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*id\s*=\s*[^>]*\b(ad|ads|advertisement|banner|popup|modal|cookie|social|share|comment|sidebar|widget|menu|header|footer|nav)\b[^>]*>[\s\S]*?<\/div>/gi,

            // Remove HTML comments
            /<!--[\s\S]*?-->/g
        ];

        elementsToRemove.forEach(pattern => {
            content = content.replace(pattern, ' ');
        });

        // Try to find main content area first
        let mainContent = '';

        // Look for main content containers (in order of preference)
        const contentSelectors = [
            /<main[^>]*>([\s\S]*?)<\/main>/i,
            /<article[^>]*>([\s\S]*?)<\/article>/i,
            /<div[^>]*role\s*=\s*['"]\s*main\s*['"][^>]*>([\s\S]*?)<\/div>/i,
            /<section[^>]*class\s*=\s*[^>]*\b(content|post|article|main)\b[^>]*>([\s\S]*?)<\/section>/i,
            /<div[^>]*class\s*=\s*[^>]*\b(content|post|article|main|entry)\b[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*id\s*=\s*[^>]*\b(content|post|article|main|entry)\b[^>]*>([\s\S]*?)<\/div>/i
        ];

        for (const selector of contentSelectors) {
            const match = content.match(selector);
            if (match && match[1] && match[1].trim().length > 200) {
                mainContent = match[1];
                break;
            }
        }

        // If no main content found, use body but remove more structural elements
        if (!mainContent) {
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                mainContent = bodyMatch[1];
            } else {
                mainContent = content;
            }
        }

        // Extract only text content, preserving paragraph structure
        const textContent = this.extractTextContent(mainContent);

        return {
            title: title,
            content: textContent,
            description: description
        };
    }

    extractTextContent(html) {
        // Remove any remaining unwanted elements
        let text = html;

        // Remove remaining tags that don't contain useful text
        const tagsToRemove = [
            /<img[^>]*>/gi,
            /<input[^>]*>/gi,
            /<button[^>]*>[\s\S]*?<\/button>/gi,
            /<select[^>]*>[\s\S]*?<\/select>/gi,
            /<textarea[^>]*>[\s\S]*?<\/textarea>/gi,
            /<canvas[^>]*>[\s\S]*?<\/canvas>/gi,
            /<video[^>]*>[\s\S]*?<\/video>/gi,
            /<audio[^>]*>[\s\S]*?<\/audio>/gi
        ];

        tagsToRemove.forEach(pattern => {
            text = text.replace(pattern, ' ');
        });

        // Convert block elements to text with proper spacing
        const blockElements = [
            { tag: 'p', replacement: '\n\n' },
            { tag: 'div', replacement: '\n' },
            { tag: 'h1', replacement: '\n\n' },
            { tag: 'h2', replacement: '\n\n' },
            { tag: 'h3', replacement: '\n\n' },
            { tag: 'h4', replacement: '\n\n' },
            { tag: 'h5', replacement: '\n\n' },
            { tag: 'h6', replacement: '\n\n' },
            { tag: 'li', replacement: '\n• ' },
            { tag: 'br', replacement: '\n' },
            { tag: 'hr', replacement: '\n---\n' }
        ];

        // Replace block elements with text markers
        blockElements.forEach(({ tag, replacement }) => {
            const openTag = new RegExp(`<${tag}[^>]*>`, 'gi');
            const closeTag = new RegExp(`<\/${tag}>`, 'gi');

            text = text.replace(openTag, replacement);
            text = text.replace(closeTag, '');
        });

        // Handle self-closing br tags
        text = text.replace(/<br[^>]*\/?>/gi, '\n');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]*>/g, ' ');

        // Decode HTML entities
        text = this.decodeHtml(text);

        // Clean up whitespace
        text = text
            .replace(/&nbsp;/g, ' ')           // Replace non-breaking spaces
            .replace(/\t/g, ' ')               // Replace tabs with spaces
            .replace(/ +/g, ' ')               // Replace multiple spaces with single space
            .replace(/\n +/g, '\n')            // Remove spaces at start of lines
            .replace(/ +\n/g, '\n')            // Remove spaces at end of lines
            .replace(/\n{3,}/g, '\n\n')        // Replace multiple newlines with double newline
            .trim();                           // Remove leading/trailing whitespace

        // Remove empty lines and clean up formatting
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Remove lines that are likely navigation or boilerplate (very short or common phrases)
        const filteredLines = lines.filter(line => {
            if (line.length < 3) return false;
            if (/^(home|about|contact|menu|search|login|register|more|read more|click here|×|✕)$/i.test(line)) return false;
            if (/^[^\w]*$/.test(line)) return false; // Only punctuation
            return true;
        });

        return filteredLines.join('\n\n');
    }

    decodeHtml(text) {
        // Basic HTML entity decoding
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' '
        };

        return text.replace(/&[a-zA-Z0-9#]{1,10};/g, (entity) => {
            return entities[entity] || entity;
        });
    }

    countWords(text) {
        // Count words in plain text (no HTML)
        if (!text || typeof text !== 'string') return 0;

        const cleanText = this.decodeHtml(text);
        const words = cleanText.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }
}

// Main execution
async function main() {
    const url = process.argv[2];

    if (!url) {
        console.error(JSON.stringify({
            success: false,
            error: 'URL parameter is required',
            timestamp: new Date().toISOString()
        }));
        process.exit(1);
    }

    const crawler = new BasicCrawler();

    try {
        const result = await crawler.crawl(url);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            error: error.message,
            url: url,
            timestamp: new Date().toISOString()
        }));
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

if (require.main === module) {
    main();
}