<?php

namespace Api\Lib;

// Saves a verified lead to a Google Sheet via an Apps Script webhook.
// See scripts/google-sheet-webhook.gs for the script to paste into the sheet.
function save_lead_to_sheet(string $name, string $mobile, int $age, string $address, array $config): array
{
    $url = $config['GOOGLE_SHEET_WEBHOOK_URL'] ?? '';
    if (!$url) {
        error_log('[sheet] GOOGLE_SHEET_WEBHOOK_URL not set - skipping lead save');
        return ['skipped' => true];
    }

    $payload = [
        'name' => $name,
        'mobile' => $mobile,
        'age' => $age,
        'address' => $address,
        'source' => '3a-piles-kit',
        'verifiedAt' => gmdate('c'),
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => true, // Apps Script web apps respond via redirect
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        error_log("[sheet] curl error: $curlErr");
        return ['ok' => false];
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        error_log("[sheet] Failed to save lead ($httpCode): $response");
        return ['ok' => false];
    }
    return ['ok' => true];
}
