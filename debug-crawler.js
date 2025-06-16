const puppeteer = require('puppeteer');
const fs = require('fs');

async function debug() {
    console.log('=== DEBUG INFO ===');
    console.log('Node version:', process.version);
    console.log('Current user:', process.env.USER || 'unknown');
    console.log('HOME:', process.env.HOME || 'not set');
    console.log('PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR || 'not set');
    console.log('Working directory:', process.cwd());

    // Check if Chrome exists
    const possiblePaths = [
        '/home/ubuntu/.cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome',
        '/var/cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome'
    ];

    console.log('Checking Chrome paths:');
    possiblePaths.forEach(path => {
        const exists = fs.existsSync(path);
        console.log(`${path}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        if (exists) {
            try {
                const stats = fs.statSync(path);
                console.log(`  Size: ${stats.size} bytes`);
                console.log(`  Executable: ${(stats.mode & 0o111) ? 'YES' : 'NO'}`);
            } catch (e) {
                console.log(`  Error checking stats: ${e.message}`);
            }
        }
    });

    // Try to get default executable path
    try {
        console.log('Puppeteer default path:', puppeteer.executablePath());
    } catch (e) {
        console.log('Puppeteer default path error:', e.message);
    }

    // Try to launch browser with different options
    const testConfigs = [
        { name: 'Default', options: { headless: true } },
        { name: 'No-sandbox', options: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        }},
        { name: 'With explicit path', options: { 
            headless: true,
            executablePath: '/var/cache/puppeteer/chrome/linux-137.0.7151.70/chrome-linux64/chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        }}
    ];

    for (const config of testConfigs) {
        try {
            console.log(`\nTesting ${config.name}...`);
            const browser = await puppeteer.launch(config.options);
            console.log(`${config.name}: SUCCESS!`);
            await browser.close();
            break; // Stop on first success
        } catch (e) {
            console.log(`${config.name}: FAILED - ${e.message}`);
        }
    }
}

debug().catch(console.error);
