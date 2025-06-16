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
    headers: { 'User-Agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' , 'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' , 'Accept-Language' : 'en-US,en;q=0.9' , 'Accept-Encoding' : 'gzip, deflate' , 'Connection' : 'keep-alive' , 'Upgrade-Insecure-Requests' : '1' , 'Cache-Control' : 'no-cache'
    }
    });

    // Get final URL after redirects
    const finalUrl=response.request.res.responseUrl || url;
    const html=response.data;

    // Basic HTML parsing using regex
    const cleanContent=this.parseHtml(html);

    // Track redirect information
    const redirectInfo=this.getRedirectInfo(response);

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
    let errorMessage=error.message;
    let statusCode=null;
    let finalUrl=url;

    if (error.response) {
    // The request was made and the server responded with a status code
    statusCode=error.response.status;
    finalUrl=error.response.request.res.responseUrl || url;
    errorMessage=`HTTP ${statusCode}: ${error.response.statusText}`;
    } else if (error.request) {
    // The request was made but no response was received
    errorMessage='No response received from server' ;
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
    const redirects=[];

    // Try to get redirect history from axios
    if (response.request && response.request._redirectable && response.request._redirectable._redirects) {
    const redirectHistory=response.request._redirectable._redirects;
    for (let i=0; i < redirectHistory.length; i++) {
    redirects.push({
    from: i===0 ? response.config.url : redirectHistory[i - 1].url,
    to: redirectHistory[i].url,
    status: redirectHistory[i].statusCode || 'unknown'
    });
    }
    }

    return {
    count: redirects.length,
    chain: redirects,
    followed_redirects: redirects.length> 0
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
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\ /title>/i);
                    const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : '';

                    // Extract meta description
                    const metaMatch = html.match(/<meta[^>]*name\s*=\s*['"]\s*description\s*['"][^>]*content\s*=\s*['"]\s*([^'"]+)\s*['"]/i);
                        const description = metaMatch ? this.decodeHtml(metaMatch[1].trim()) : '';

                        // Remove unwanted elements
                        let content = html;

                        // Remove scripts, styles, etc.
                        content = content.replace(/<script[^>]*>[\s\S]*?<\ /script>/gi, '');
                                content = content.replace(/<style[^>]*>[\s\S]*?<\ /style>/gi, '');
                                        content = content.replace(/<noscript[^>]*>[\s\S]*?<\ /noscript>/gi, '');
                                                content = content.replace(/<iframe[^>]*>[\s\S]*?<\ /iframe>/gi, '');
                                                        content = content.replace(/<embed[^>]*>[\s\S]*?<\ /embed>/gi, '');
                                                                content = content.replace(/<object[^>]*>[\s\S]*?<\ /object>/gi, '');

                                                                        // Remove navigation and structural elements
                                                                        content = content.replace(/<nav[^>]*>[\s\S]*?<\ /nav>/gi, '');
                                                                                content = content.replace(/<header[^>]*>[\s\S]*?<\ /header>/gi, '');
                                                                                        content = content.replace(/<footer[^>]*>[\s\S]*?<\ /footer>/gi, '');
                                                                                                content = content.replace(/<aside[^>]*>[\s\S]*?<\ /aside>/gi, '');

                                                                                                        // Remove elements with ad-related classes/ids (more comprehensive)
                                                                                                        const adPatterns = [
                                                                                                        /<[^>]*class\s*=\s*[^>]*\b(ad|ads|advertisement|banner|popup|modal)\b[^>]*>[\s\S]*?<\ /[^>]+>/gi,
                                                                                                                /<[^>]*id\s*=\s*[^>]*\b(ad|ads|advertisement|banner|popup|modal|sidebar)\b[^>]*>[\s\S]*?<\ /[^>]+>/gi,
                                                                                                                        /<[^>]*class\s*=\s*[^>]*\b(social|share|comment|cookie)\b[^>]*>[\s\S]*?<\ /[^>]+>/gi
                                                                                                                                ];

                                                                                                                                adPatterns.forEach(pattern => {
                                                                                                                                content = content.replace(pattern, '');
                                                                                                                                });

                                                                                                                                // Try to find main content area
                                                                                                                                let mainContent = '';

                                                                                                                                // Look for main content containers (in order of preference)
                                                                                                                                const contentSelectors = [
                                                                                                                                /<main[^>]*>([\s\S]*?)<\ /main>/i,
                                                                                                                                        /<article[^>]*>([\s\S]*?)<\ /article>/i,
                                                                                                                                                /<div[^>]*class\s*=\s*[^>]*\bcontent\b[^>]*>([\s\S]*?)<\ /div>/i,
                                                                                                                                                        /<div[^>]*id\s*=\s*[^>]*\bcontent\b[^>]*>([\s\S]*?)<\ /div>/i,
                                                                                                                                                                /<div[^>]*class\s*=\s*[^>]*\bpost\b[^>]*>([\s\S]*?)<\ /div>/i,
                                                                                                                                                                        /<div[^>]*class\s*=\s*[^>]*\barticle\b[^>]*>([\s\S]*?)<\ /div>/i
                                                                                                                                                                                ];

                                                                                                                                                                                for (const selector of contentSelectors) {
                                                                                                                                                                                const match = content.match(selector);
                                                                                                                                                                                if (match && match[1] && match[1].trim().length > 100) {
                                                                                                                                                                                mainContent = match[1];
                                                                                                                                                                                break;
                                                                                                                                                                                }
                                                                                                                                                                                }

                                                                                                                                                                                // Fallback to body content
                                                                                                                                                                                if (!mainContent) {
                                                                                                                                                                                const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\ /body>/i);
                                                                                                                                                                                        mainContent = bodyMatch ? bodyMatch[1] : content;
                                                                                                                                                                                        }

                                                                                                                                                                                        // Clean up the content
                                                                                                                                                                                        mainContent = mainContent
                                                                                                                                                                                        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                                                                                                                                                                                        .replace(/>\s+</g, '><' ) // Remove spaces between tags
                                                                                                                                                                                            .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
                                                                                                                                                                                        .trim();

                                                                                                                                                                                        return {
                                                                                                                                                                                        title: title,
                                                                                                                                                                                        content: mainContent,
                                                                                                                                                                                        description: description
                                                                                                                                                                                        };
                                                                                                                                                                                        }

                                                                                                                                                                                        decodeHtml(text) {
                                                                                                                                                                                        // Basic HTML entity decoding
                                                                                                                                                                                        const entities = {
                                                                                                                                                                                        '&amp;': '&',
                                                                                                                                                                                        '&lt;': '<', '&gt;' : '>' , '&quot;' : '"' , '&#39;' : "'" , '&apos;' : "'" , '&nbsp;' : ' '
                                                                                                                                                                                            };

                                                                                                                                                                                            return text.replace(/&[a-zA-Z0-9#]{1,10};/g, (entity)=> {
                                                                                                                                                                                            return entities[entity] || entity;
                                                                                                                                                                                            });
                                                                                                                                                                                            }

                                                                                                                                                                                            countWords(html) {
                                                                                                                                                                                            // Strip HTML tags and count words
                                                                                                                                                                                            const text = html.replace(/<[^>]*>/g, ' ');
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