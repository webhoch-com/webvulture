<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets `X-Robots-Tag: noindex, nofollow` on every response from the admin app.
 *
 * Belt-and-braces complement to the HTML `<meta name="robots">` already in
 * layouts: covers non-HTML responses (the CSV export, JSON error pages,
 * webhook 4xx error bodies) that conforming crawlers may otherwise index.
 * The robots.txt blanket Disallow handles bots that obey it; this header
 * handles bots that crawl despite robots.txt but obey HTTP-level hints.
 */
class NoIndexHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);
        if (! $response->headers->has('X-Robots-Tag')) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
        }

        return $response;
    }
}
