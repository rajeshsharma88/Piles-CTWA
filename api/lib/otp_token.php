<?php

namespace Api\Lib;

// Stateless, signed OTP session token — avoids needing a database just to
// hold a 5-minute OTP. The OTP itself is never stored in plain text in the
// token; only an HMAC hash of it, so a client reading the token cannot learn
// the code.

const TTL_SECONDS = 300; // 5 minutes
const MAX_ATTEMPTS = 5;

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    $b64 = strtr($data, '-_', '+/');
    $pad = strlen($b64) % 4;
    if ($pad) {
        $b64 .= str_repeat('=', 4 - $pad);
    }
    return base64_decode($b64);
}

function sign(string $payloadStr, string $secret): string
{
    return base64url_encode(hash_hmac('sha256', $payloadStr, $secret, true));
}

function hash_otp(string $mobile, string $otp, string $secret): string
{
    return hash_hmac('sha256', "$mobile:$otp", $secret);
}

function sign_payload(array $payload, string $secret): string
{
    $payloadStr = base64url_encode(json_encode($payload));
    return $payloadStr . '.' . sign($payloadStr, $secret);
}

function create_otp_token(string $mobile, string $otp, string $name, int $age, string $address, string $secret): string
{
    return sign_payload([
        'mobile' => $mobile,
        'otpHash' => hash_otp($mobile, $otp, $secret),
        'name' => $name,
        'age' => $age,
        'address' => $address,
        'attempts' => 0,
        'exp' => time() + TTL_SECONDS,
    ], $secret);
}

// Returns the decoded payload array, ['expired' => true] if past TTL,
// or null if the token is missing/tampered.
function verify_otp_token(?string $token, string $secret): ?array
{
    if (!$token || strpos($token, '.') === false) {
        return null;
    }
    [$payloadStr, $sig] = explode('.', $token, 2);
    if (!$payloadStr || !$sig || !hash_equals(sign($payloadStr, $secret), $sig)) {
        return null;
    }

    $payload = json_decode(base64url_decode($payloadStr), true);
    if (!is_array($payload) || !isset($payload['exp'])) {
        return null;
    }

    if (time() > $payload['exp']) {
        return ['expired' => true];
    }
    return $payload;
}

function match_otp(array $payload, string $mobile, string $otp, string $secret): bool
{
    return isset($payload['mobile'], $payload['otpHash'])
        && $payload['mobile'] === $mobile
        && hash_equals($payload['otpHash'], hash_otp($mobile, $otp, $secret));
}

// Re-signs the same payload with attempts incremented, so a wrong guess
// costs an attempt without letting the client forge its own attempt count.
function reissue_with_attempt(array $payload, string $secret): string
{
    $payload['attempts'] = ($payload['attempts'] ?? 0) + 1;
    return sign_payload($payload, $secret);
}
