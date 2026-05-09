import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
});

// Bridge LeadStatusChanged → Livewire so any component can subscribe via #[On('lead-updated')].
document.addEventListener('livewire:init', () => {
    if (!window.Echo) return;

    window.Echo.private('leads')
        .listen('.lead.status.changed', (event) => {
            window.Livewire.dispatch('lead-updated', { data: event });
        })
        .listen('.job.progress.updated', (event) => {
            window.Livewire.dispatch('job-progress', { data: event });
        });
});
