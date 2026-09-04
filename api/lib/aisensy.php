<?php

namespace Api\Lib;

// Sends the OTP via AiSensy's Campaign API, using the approved
// "piles3akit_otp_verification" Authentication template.
//
// Authentication templates on WhatsApp/Meta only support the body
// (templateParams) plus optional one-tap "Copy Code" autofill buttons.
// The old payload shape here combined both and was rejected by AISensy.
// We now send ONLY templateParams by default. To enable the one-tap
// autofill button once your Authentication template has it configured,
// set AISENSY_INCLUDE_COPY_BUTTON = true in config.php.
function send_otp_via_aisensy(string $mobile, string $otp, string $name, array $config): array
{
    $apiKey = $config['AISENSY_API_KEY'] ?? '';
    $campaignName = $config['AISENSY_OTP_CAMPAIGN_NAME'] ?? '';
    $includeCopyButton = !empty($config['AISENSY_INCLUDE_COPY_BUTTON']);

    if (!$apiKey || !$campaignName) {
        // Mock mode: lets the whole flow be tested end-to-end before AiSensy
        // credentials exist. The OTP is written to PHP's error log only.
        error_log("[aisensy] MOCK MODE (missing AISENSY_API_KEY/AISENSY_OTP_CAMPAIGN_NAME) - OTP for $mobile is $otp");
        return ['mocked' => true];
    }

    $destination = (strpos($mobile, '91') === 0) ? $mobile : "91$mobile";

    $payload = [
        'apiKey' => $apiKey,
        'campaignName' => $campaignName,
        'destination' => $destination,
        'userName' => $name ?: 'Customer',
        'templateParams' => [$otp],
    ];

    // One-tap "Copy Code" autofill button. Meta/AISensy expects either
    // sub_type "copy_code" (newer Authentication templates) or "url" with
    // a copy-code parameter — confirm with AISensy docs before flipping
    // AISENSY_INCLUDE_COPY_BUTTON on, and ensure your Authentication
    // template actually has the button approved.
    if ($includeCopyButton) {
        $payload['buttons'] = [[
            'type' => 'button',
            'sub_type' => 'copy_code',
            'index' => 0,
            'parameters' => [['type' => 'text', 'text' => $otp]],
        ]];
    }

    $ch = curl_init('https://backend.aisensy.com/campaign/t1/api/v2');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        throw new \RuntimeException("AiSensy request failed: $curlErr");
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new \RuntimeException("AiSensy send failed ($httpCode): $response");
    }

    $data = json_decode($response, true);
    return is_array($data) ? $data : [];
}
