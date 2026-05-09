<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $leadId,
        public string $status,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('leads')];
    }

    public function broadcastAs(): string
    {
        return 'lead.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'lead_id' => $this->leadId,
            'status' => $this->status,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
