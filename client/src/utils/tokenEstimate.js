// Rough client-side token estimator (4 chars ≈ 1 token)
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export function estimateCost(inputTokens, outputTokens) {
  return (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;
}
