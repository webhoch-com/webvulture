<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JobProgressUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $leadId,
        public string $stage,
        public string $status,
        public ?string $message = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('leads')];
    }

    public function broadcastAs(): string
    {
        return 'job.progress.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'lead_id' => $this->leadId,
            'stage' => $this->stage,
            'status' => $this->status,
            'message' => $this->message,
        ];
    }
}
