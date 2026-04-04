const STATUS_CONFIG = {
  new: { label: 'Neu', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  approved: { label: 'Freigegeben', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  teaser_generated: { label: 'Teaser erstellt', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  email_generated: { label: 'Email erstellt', bg: 'bg-green-500/20', text: 'text-green-400' },
  contacted: { label: 'Kontaktiert', bg: 'bg-teal-500/20', text: 'text-teal-400' },
  follow_up: { label: 'Follow-up', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  responded: { label: 'Gemeldet', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  no_interest: { label: 'Kein Interesse', bg: 'bg-red-500/20', text: 'text-red-400' },
  meeting: { label: 'Termin', bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  won: { label: 'Gewonnen', bg: 'bg-lime-500/20', text: 'text-lime-400' },
  archived: { label: 'Archiviert', bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
