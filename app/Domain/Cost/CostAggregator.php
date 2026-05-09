<?php

namespace App\Domain\Cost;

use App\Models\CostLog;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use App\Models\SearchRun;
use Illuminate\Support\Carbon;

/**
 * Centralised cost aggregations for the dashboard.
 * All amounts are returned in cents.
 */
class CostAggregator
{
    /** @return array{from: ?Carbon, to: ?Carbon, label: string} */
    public static function periodFor(string $period): array
    {
        return match ($period) {
            'today'  => ['from' => Carbon::today(),               'to' => Carbon::tomorrow(),       'label' => 'Heute'],
            '7d'     => ['from' => Carbon::today()->subDays(6),   'to' => Carbon::tomorrow(),       'label' => 'Letzte 7 Tage'],
            '30d'    => ['from' => Carbon::today()->subDays(29),  'to' => Carbon::tomorrow(),       'label' => 'Letzte 30 Tage'],
            'all'    => ['from' => null,                          'to' => null,                     'label' => 'Gesamt'],
            default  => ['from' => Carbon::today(),               'to' => Carbon::tomorrow(),       'label' => 'Heute'],
        };
    }

    /**
     * Total cost for a period across every provider/purpose.
     */
    public static function total(string $period = 'today'): int
    {
        return (int) self::baseQuery($period)->sum('cost_cents');
    }

    /**
     * Cost broken down per logical bucket (search / enrichment / prototype-build).
     *
     * @return array<string, int>
     */
    public static function breakdown(string $period = 'today'): array
    {
        $rows = self::baseQuery($period)
            ->selectRaw('provider, cost_cents, meta')
            ->get();

        $buckets = [
            'maps' => 0,
            'enrichment' => 0,
            'prototype' => 0,
            'other' => 0,
        ];

        foreach ($rows as $row) {
            $provider = $row->provider instanceof \BackedEnum ? $row->provider->value : (string) $row->provider;
            $meta = $row->meta ?? [];
            $purpose = is_array($meta) ? ($meta['purpose'] ?? null) : null;
            $phase = is_array($meta) ? ($meta['phase'] ?? null) : null;
            // Recognise both naming conventions used in this codebase:
            //  - meta.purpose = 'enrichment' / 'prototype_generation'  (newer)
            //  - meta.phase   = 'enrichment' / 'generation'           (jovial)
            $isPrototypeGeneration = ($purpose === 'prototype_generation') || ($phase === 'generation');
            $isEnrichment = ($purpose === 'enrichment') || ($phase === 'enrichment');
            $cents = (int) $row->cost_cents;

            if ($provider === 'maps') {
                $buckets['maps'] += $cents;
            } elseif ($provider === 'claude' && $isEnrichment) {
                $buckets['enrichment'] += $cents;
            } elseif ($provider === 'claude' && $isPrototypeGeneration) {
                $buckets['prototype'] += $cents;
            } else {
                $buckets['other'] += $cents;
            }
        }

        return $buckets;
    }

    /**
     * Top-N most expensive leads for a period.
     * Returns rows with: lead_id, name, city, search_cents, enrichment_cents, prototype_cents, total_cents.
     *
     * @return array<int, array{
     *   lead_id:int, name:string, city:?string,
     *   search_cents:int, enrichment_cents:int, prototype_cents:int, total_cents:int
     * }>
     */
    public static function topLeads(string $period = 'today', int $limit = 10): array
    {
        ['from' => $from, 'to' => $to] = self::periodFor($period);

        // Pull all relevant cost logs in the window once and aggregate in PHP.
        // Select only the columns we need to keep memory bounded on large result sets.
        $query = CostLog::query()
            ->select(['id', 'costable_type', 'costable_id', 'provider', 'cost_cents', 'meta', 'created_at']);
        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to]);
        }
        $logs = $query->get();

        $byLead = [];
        $prototypeVersionToLead = [];
        $searchRunToLeads = [];

        // Pre-resolve PrototypeVersion -> Lead
        $versionIds = $logs->where('costable_type', PrototypeVersion::class)->pluck('costable_id')->unique();
        if ($versionIds->isNotEmpty()) {
            $rows = PrototypeVersion::whereIn('prototype_versions.id', $versionIds)
                ->join('prototypes', 'prototypes.id', '=', 'prototype_versions.prototype_id')
                ->pluck('prototypes.lead_id', 'prototype_versions.id');
            $prototypeVersionToLead = $rows->all();
        }

        // Pre-resolve SearchRun -> [lead_ids] in a single query (avoids N+1 in the foreach).
        $searchRunIds = $logs->where('costable_type', SearchRun::class)->pluck('costable_id')->unique();
        if ($searchRunIds->isNotEmpty()) {
            $rows = Lead::whereIn('search_run_id', $searchRunIds)->select(['id', 'search_run_id'])->get();
            foreach ($rows as $row) {
                $searchRunToLeads[$row->search_run_id][] = (int) $row->id;
            }
        }

        foreach ($logs as $log) {
            $cents = (int) $log->cost_cents;
            $meta = $log->meta ?? [];
            $purpose = is_array($meta) ? ($meta['purpose'] ?? null) : null;
            $phase = is_array($meta) ? ($meta['phase'] ?? null) : null;
            $isPrototypeGeneration = ($purpose === 'prototype_generation') || ($phase === 'generation');
            $isEnrichment = ($purpose === 'enrichment') || ($phase === 'enrichment');

            $leadId = match ($log->costable_type) {
                Lead::class => (int) $log->costable_id,
                PrototypeVersion::class => $prototypeVersionToLead[$log->costable_id] ?? null,
                SearchRun::class => null, // resolved below via meta or run leads
                default => null,
            };

            // SearchRun cost is shared across the leads the run produced.
            // Use meta.lead_id if present, else divide evenly using the pre-resolved map.
            if ($log->costable_type === SearchRun::class) {
                if (is_array($meta) && isset($meta['lead_id'])) {
                    $leadId = (int) $meta['lead_id'];
                } else {
                    $leadIds = $searchRunToLeads[$log->costable_id] ?? [];
                    if (!$leadIds) continue;
                    $share = (int) floor($cents / max(1, count($leadIds)));
                    foreach ($leadIds as $lid) {
                        $byLead[$lid]['search_cents'] = ($byLead[$lid]['search_cents'] ?? 0) + $share;
                        $byLead[$lid]['total_cents'] = ($byLead[$lid]['total_cents'] ?? 0) + $share;
                    }
                    continue;
                }
            }

            if (!$leadId) continue;

            $byLead[$leadId]['total_cents'] = ($byLead[$leadId]['total_cents'] ?? 0) + $cents;
            $provider = $log->provider instanceof \BackedEnum ? $log->provider->value : (string) $log->provider;

            if ($provider === 'maps') {
                $byLead[$leadId]['search_cents'] = ($byLead[$leadId]['search_cents'] ?? 0) + $cents;
            } elseif ($provider === 'claude' && $isEnrichment) {
                $byLead[$leadId]['enrichment_cents'] = ($byLead[$leadId]['enrichment_cents'] ?? 0) + $cents;
            } elseif ($provider === 'claude' && $isPrototypeGeneration) {
                $byLead[$leadId]['prototype_cents'] = ($byLead[$leadId]['prototype_cents'] ?? 0) + $cents;
            } else {
                $byLead[$leadId]['other_cents'] = ($byLead[$leadId]['other_cents'] ?? 0) + $cents;
            }
        }

        if (!$byLead) return [];

        $topIds = collect($byLead)
            ->sortByDesc(fn ($v) => $v['total_cents'] ?? 0)
            ->take($limit)
            ->keys()
            ->all();

        $leads = Lead::whereIn('id', $topIds)->get(['id', 'name', 'city'])->keyBy('id');

        $result = [];
        foreach ($topIds as $id) {
            $lead = $leads->get($id);
            if (!$lead) continue;
            $b = $byLead[$id];
            $result[] = [
                'lead_id'           => (int) $id,
                'name'              => $lead->name,
                'city'              => $lead->city,
                'search_cents'      => $b['search_cents'] ?? 0,
                'enrichment_cents'  => $b['enrichment_cents'] ?? 0,
                'prototype_cents'   => $b['prototype_cents'] ?? 0,
                'total_cents'       => $b['total_cents'] ?? 0,
            ];
        }
        return $result;
    }

    /**
     * Provider breakdown — one row per provider for the period.
     *
     * @return array<int, array{provider:string, cost_cents:int, units:int}>
     */
    public static function byProvider(string $period = 'today'): array
    {
        return self::baseQuery($period)
            ->selectRaw('provider, SUM(cost_cents) as cost_cents, SUM(units) as units')
            ->groupBy('provider')
            ->orderByDesc('cost_cents')
            ->get()
            ->map(fn ($r) => [
                'provider'   => (string) $r->provider,
                'cost_cents' => (int) $r->cost_cents,
                'units'      => (int) $r->units,
            ])
            ->all();
    }

    private static function baseQuery(string $period)
    {
        ['from' => $from, 'to' => $to] = self::periodFor($period);
        $query = CostLog::query();
        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to]);
        }
        return $query;
    }
}
