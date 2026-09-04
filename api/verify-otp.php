<?php

require __DIR__ . '/lib/otp_token.php';
require __DIR__ . '/lib/sheet.php';

use function Api\Lib\verify_otp_token;
use function Api\Lib\match_otp;
use function Api\Lib\reissue_with_attempt;
use function Api\Lib\save_lead_to_sheet;
use const Api\Lib\MAX_ATTEMPTS;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$configFile = __DIR__ . '/lib/config.php';
$config = file_exists($configFile) ? require $configFile : [];
$secret = $config['OTP_SIGNING_SECRET'] ?? 'dev-insecure-secret-change-me';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

$mobile = trim((string) ($input['mobile'] ?? ''));
$otp = trim((string) ($input['otp'] ?? ''));
$token = $input['token'] ?? null;

if (!$mobile || !$otp || !$token) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing fields']);
    exit;
}

$payload = verify_otp_token($token, $secret);

if ($payload === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid session, कृपया नया OTP लें']);
    exit;
}
if (isset($payload['expired'])) {
    http_response_code(400);
    echo json_encode(['error' => 'OTP समय सीमा समाप्त, कृपया नया OTP लें']);
    exit;
}
if (($payload['attempts'] ?? 0) >= MAX_ATTEMPTS) {
    http_response_code(400);
    echo json_encode(['error' => 'बहुत ज़्यादा गलत प्रयास, कृपया नया OTP लें']);
    exit;
}

if (!match_otp($payload, $mobile, $otp, $secret)) {
    $attemptsLeft = MAX_ATTEMPTS - ($payload['attempts'] + 1);
    if ($attemptsLeft <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'बहुत ज़्यादा गलत प्रयास, कृपया नया OTP लें']);
        exit;
    }
    http_response_code(400);
    echo json_encode([
        'error' => "गलत OTP। {$attemptsLeft} प्रयास शेष हैं।",
        'token' => reissue_with_attempt($payload, $secret),
    ]);
    exit;
}

save_lead_to_sheet($payload['name'], $payload['mobile'], (int) $payload['age'], $payload['address'] ?? '', $config);

echo json_encode(['success' => true]);
