<?php

/**
 * Agency identity used in outreach mails, demo banners, signature lines.
 * Single source of truth — change here, propagates everywhere.
 *
 * Override per env via AGENCY_* keys if needed for staging/test setups.
 */

return [
    'company' => env('AGENCY_COMPANY', 'Webagentur Hochmeir e.U.'),
    'founder' => env('AGENCY_FOUNDER', 'Jonathan Hochmeir'),
    'tagline' => env('AGENCY_TAGLINE', 'Custom Software, Web Apps, Webseiten & Online Shops — maßgeschneidert, modern und performant.'),
    'years_active' => env('AGENCY_YEARS_ACTIVE', 'fünf Jahre'),

    // Postal address (Rechnungsanschrift) — Rutzenmoos is the postal town,
    // Regau is the political municipality.
    'address' => [
        'street' => env('AGENCY_STREET', 'Moorweg 7'),
        'postal_code' => env('AGENCY_POSTAL_CODE', '4845'),
        'city' => env('AGENCY_CITY', 'Rutzenmoos'),
        'municipality' => env('AGENCY_MUNICIPALITY', 'Regau'),
        'country' => env('AGENCY_COUNTRY', 'Österreich'),
    ],

    'phone' => env('AGENCY_PHONE', '+43 680 2208354'),
    'email' => env('AGENCY_EMAIL', 'hello@webhoch.com'),
    'website' => env('AGENCY_WEBSITE', 'https://webhoch.com'),
    'website_contact_url' => env('AGENCY_WEBSITE_CONTACT', 'https://webhoch.com/#contact'),
];
