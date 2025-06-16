<?php
// Load environment variables
require_once __DIR__ . '/env-loader.php';

try {
    loadEnv(__DIR__ . '/.env');
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Configuration error: ' . $e->getMessage(),
        'timestamp' => date('c')
    ]);
    exit;
}

// Set content type
header('Content-Type: application/json');

// Enable CORS if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get URL from request
$url = $_GET['url'] ?? $_POST['url'] ?? null;

if (!$url) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'No URL provided',
        'usage' => 'Send URL as GET parameter: ?url=https://example.com or POST data',
        'timestamp' => date('c')
    ]);
    exit;
}

// Validate URL
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid URL format',
        'provided_url' => $url,
        'timestamp' => date('c')
    ]);
    exit;
}

// Set environment variables for the Node.js process
putenv('PUPPETEER_CACHE_DIR=' . env('PUPPETEER_CACHE_DIR'));
putenv('HOME=/home/ubuntu');

// Build command - use wrapper script in same directory
$wrapperScript = __DIR__ . '/run-crawler.sh';

if (file_exists($wrapperScript)) {
    $command = $wrapperScript . ' --json ' . escapeshellarg($url) . ' 2>&1';
} else {
    // Fallback to direct node execution
    $command = 'cd ' . __DIR__ . ' && node basic-crawler.js --json ' . escapeshellarg($url) . ' 2>&1';
}

// Log the command if debug mode is enabled
if (env('DEBUG_MODE') === 'true') {
    error_log("Crawler command: " . $command);
}

// Execute the crawler
$startTime = microtime(true);
$output = shell_exec($command);
$endTime = microtime(true);
$executionTime = round(($endTime - $startTime) * 1000, 2); // Convert to milliseconds

// Log output if debug mode is enabled
if (env('DEBUG_MODE') === 'true') {
    error_log("Crawler output: " . $output);
}

// Try to decode JSON response
$result = json_decode($output, true);

if ($result === null && json_last_error() !== JSON_ERROR_NONE) {
    // JSON decode failed
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON response from crawler',
        'json_error' => json_last_error_msg(),
        'raw_output' => trim($output),
        'execution_time_ms' => $executionTime,
        'command' => env('DEBUG_MODE') === 'true' ? $command : 'Hidden (enable DEBUG_MODE)',
        'timestamp' => date('c')
    ]);
} else {
    // Success - add metadata to response
    if (is_array($result)) {
        $result['execution_time_ms'] = $executionTime;
        $result['processed_by'] = 'PHP Web Interface';
    }

    // Set appropriate HTTP status code
    $httpCode = (isset($result['success']) && $result['success']) ? 200 : 500;
    http_response_code($httpCode);

    echo json_encode($result, JSON_PRETTY_PRINT);
}
