const MODEL_PRICING = {
  'claude-opus-4-20250514': { inputPerMillion: 15, outputPerMillion: 75 },
  'claude-sonnet-4-20250514': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 0.80, outputPerMillion: 4 },
};

export function calculateCost(usage, model = 'claude-opus-4-20250514') {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-opus-4-20250514'];
  const inputCost = (usage.input_tokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.outputPerMillion;
  const totalUsd = inputCost + outputCost;
  const totalEur = totalUsd * 0.92;
  return Math.round(totalEur * 10000) / 10000;
}
