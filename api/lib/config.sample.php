<?php

// Copy this file to config.php (same folder) and fill in real values.
// config.php is gitignored — never commit real secrets to the repo.
// Upload config.php to the server via Hostinger's File Manager or FTP.

return [
    // AiSensy dashboard -> API key
    'AISENSY_API_KEY' => '',

    // The AiSensy Campaign name linked to the approved
    // "piles3akit_otp_verification" Authentication template
    'AISENSY_OTP_CAMPAIGN_NAME' => '',

    // Set to true ONLY after the Authentication template has a one-tap
    // "Copy Code" button approved by Meta and AISensy supports it.
    // Leave false to start — sending without a button is always valid for
    // Authentication templates.
    'AISENSY_INCLUDE_COPY_BUTTON' => false,

    // Any long random string — used to sign OTP session tokens.
    // Generate one with: php -r "echo bin2hex(random_bytes(32));"
    'OTP_SIGNING_SECRET' => 'change-me-to-a-long-random-string',

    // Google Apps Script Web App URL (see scripts/google-sheet-webhook.gs)
    'GOOGLE_SHEET_WEBHOOK_URL' => '',
];
