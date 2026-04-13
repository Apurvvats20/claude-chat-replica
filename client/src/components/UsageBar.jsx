import React from "react";

const INPUT_COST = 3.0; // $ per 1M tokens
const OUTPUT_COST = 15.0;

function calcCost(usage) {
  return (
    (usage.inputTokens / 1_000_000) * INPUT_COST +
    (usage.outputTokens / 1_000_000) * OUTPUT_COST
  );
}

export default function UsageBar({ usage }) {
  const totalTokens = usage.inputTokens + usage.outputTokens;
  const cost = calcCost(usage);

  return (
    <div style={styles.bar}>
      <span style={styles.brand}>Claude</span>
      <div style={styles.stats}>
        {totalTokens > 0 && (
          <>
            <span style={styles.stat}>{totalTokens.toLocaleString()} tokens</span>
            <span style={styles.dot}>·</span>
            <span style={styles.stat}>${cost.toFixed(4)}</span>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
    flexShrink: 0,
  },
  brand: {
    fontWeight: 600,
    fontSize: 16,
    color: "var(--accent)",
    letterSpacing: "-0.01em",
  },
  stats: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  stat: {
    fontSize: 12,
    color: "var(--text-muted)",
  },
  dot: {
    fontSize: 12,
    color: "var(--border)",
  },
};
