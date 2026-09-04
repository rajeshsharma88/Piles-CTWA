<?php

namespace Api\Lib;

// File-based rate limiter (shared hosting has persistent disk across
// requests, unlike serverless, so this is reliable — unlike an in-memory
// map it survives every request). Uses flock() to stay safe under
// concurrent requests.
const RATE_WINDOW_SECONDS = 3600;
const RATE_MAX_PER_WINDOW = 3;

function is_rate_limited(string $mobile, string $storageDir): bool
{
    if (!is_dir($storageDir)) {
        @mkdir($storageDir, 0755, true);
    }

    $file = $storageDir . '/rate_limit.json';
    $fp = @fopen($file, 'c+');
    if (!$fp) {
        // Fail open: a disk/permission issue shouldn't block real users.
        return false;
    }

    flock($fp, LOCK_EX);
    $contents = stream_get_contents($fp);
    $data = $contents ? json_decode($contents, true) : [];
    if (!is_array($data)) {
        $data = [];
    }

    $now = time();
    $hits = array_values(array_filter($data[$mobile] ?? [], function ($t) use ($now) {
        return $now - $t < RATE_WINDOW_SECONDS;
    }));

    $limited = count($hits) >= RATE_MAX_PER_WINDOW;
    if (!$limited) {
        $hits[] = $now;
    }
    $data[$mobile] = $hits;

    // Occasionally prune stale numbers so the file doesn't grow forever.
    if (count($data) > 500) {
        foreach ($data as $key => $timestamps) {
            $recent = array_filter($timestamps, function ($t) use ($now) {
                return $now - $t < RATE_WINDOW_SECONDS;
            });
            if (empty($recent)) {
                unset($data[$key]);
            }
        }
    }

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    return $limited;
}
