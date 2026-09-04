<?php

require __DIR__ . '/lib/otp_token.php';
require __DIR__ . '/lib/aisensy.php';
require __DIR__ . '/lib/rate_limit.php';

use function Api\Lib\create_otp_token;
use function Api\Lib\send_otp_via_aisensy;
use function Api\Lib\is_rate_limited;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$configFile = __DIR__ . '/lib/config.php';
$config = file_exists($configFile) ? require $configFile : [];

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

$name = trim((string) ($input['name'] ?? ''));
$mobile = trim((string) ($input['mobile'] ?? ''));
$age = $input['age'] ?? null;
$address = trim((string) ($input['address'] ?? ''));
$company = trim((string) ($input['company'] ?? '')); // honeypot — real users never fill this in

if ($company !== '') {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid submission']);
    exit;
}
if (mb_strlen($name) < 2) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid name required']);
    exit;
}
if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid 10-digit mobile number required']);
    exit;
}
$ageNum = (int) $age;
if ($ageNum < 1 || $ageNum > 120) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid age required']);
    exit;
}

if (is_rate_limited($mobile, __DIR__ . '/data')) {
    http_response_code(429);
    echo json_encode(['error' => 'बहुत ज़्यादा OTP अनुरोध। कृपया कुछ देर बाद प्रयास करें।']);
    exit;
}

$otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$secret = $config['OTP_SIGNING_SECRET'] ?? 'dev-insecure-secret-change-me';
$token = create_otp_token($mobile, $otp, $name, $ageNum, $address, $secret);

try {
    send_otp_via_aisensy($mobile, $otp, $name, $config);
} catch (\Throwable $e) {
    error_log('[send-otp] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'OTP भेजने में समस्या हुई, कृपया दोबारा प्रयास करें']);
    exit;
}

echo json_encode(['success' => true, 'token' => $token]);
