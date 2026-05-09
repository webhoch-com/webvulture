<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $bodyText ? 'Nachricht von Webagentur Hochmeir e.U.' : '' }}</title>
</head>
<body style="margin:0; padding:0; background:#f8f9fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fb; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <tr>
                        <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f0f0f3;">
                            <a href="{{ config('agency.website') }}" style="display:inline-block; text-decoration:none;">
                                <strong style="font-size: 18px; color: #1a1a1a; letter-spacing: -0.01em;">{{ config('agency.company') }}</strong>
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 28px 32px; line-height: 1.65; font-size: 15px; color: #1a1a1a;">
                            @foreach (preg_split("/\\r\\n|\\r|\\n/", $bodyText) as $line)
                                @if (trim($line) === '')
                                    <p style="margin: 0 0 14px 0;">&nbsp;</p>
                                @else
                                    <p style="margin: 0 0 14px 0;">{{ $line }}</p>
                                @endif
                            @endforeach
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 32px 28px 32px; border-top: 1px solid #f0f0f3; background: #fafbfc; font-size: 12px; color: #6b7280; line-height: 1.6;">
                            <strong style="color:#1a1a1a;">{{ config('agency.company') }}</strong><br>
                            {{ config('agency.address.street') }} ·
                            {{ config('agency.address.postal_code') }} {{ config('agency.address.city') }} ·
                            {{ config('agency.address.country') }}<br>
                            <a href="tel:{{ str_replace(' ', '', config('agency.phone')) }}" style="color:#6b7280;">{{ config('agency.phone') }}</a> ·
                            <a href="mailto:{{ config('agency.email') }}" style="color:#6b7280;">{{ config('agency.email') }}</a> ·
                            <a href="{{ config('agency.website') }}" style="color:#6b7280;">{{ str_replace(['https://','http://'], '', config('agency.website')) }}</a>
                        </td>
                    </tr>
                </table>
                <p style="font-size: 11px; color: #9ca3af; margin-top: 16px; text-align:center; line-height:1.5;">
                    Sie erhalten diese Nachricht, weil wir glauben, unsere Leistungen könnten für Ihr Unternehmen interessant sein.<br>
                    Möchten Sie keine weiteren Nachrichten? Antworten Sie kurz mit „Nein, danke" — wir entfernen Sie sofort.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
