<?php

namespace App\Mail;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeadOutreachMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Lead $lead,
        public string $subjectLine,
        public string $bodyText,
    ) {}

    public function envelope(): Envelope
    {
        $agencyEmail = (string) config('agency.email');
        $agencyName = (string) config('agency.company');
        $fromAddress = (string) config('mail.from.address') ?: $agencyEmail;
        $fromName = (string) config('mail.from.name') ?: $agencyName;

        return new Envelope(
            subject: $this->subjectLine,
            from: $fromAddress !== '' ? new Address($fromAddress, $fromName) : null,
            replyTo: $agencyEmail !== ''
                ? [new Address($agencyEmail, $agencyName !== '' ? $agencyName : 'Webagentur Hochmeir e.U.')]
                : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.lead-outreach',
            with: [
                'lead' => $this->lead,
                'bodyText' => $this->bodyText,
            ],
        );
    }
}
