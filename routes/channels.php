<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// All authenticated users can subscribe to lead-status updates.
// Single-tenant for now; for multi-tenancy add a team scope here.
Broadcast::channel('leads', function ($user) {
    return $user !== null;
});
