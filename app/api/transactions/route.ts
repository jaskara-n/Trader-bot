import { NextResponse } from "next/server";
import { getAllTransactions } from "@/app/utils/transactionInsights";
import type { Transaction } from "@/app/types/transactions";

// Helper: cumulative balances per token for each tx index
function getPerTokenCumulative(txs: Transaction[]) {
  const cumulative: Record<string, number[]> = {};
  const running: Record<string, number> = {};
  txs.forEach((tx, i) => {
    if (tx.type === "swap" && tx.details.tokens && tx.details.amounts) {
      tx.details.tokens.forEach((token, idx) => {
        running[token] = (running[token] || 0) + Number(tx.details.amounts?.[idx] ?? 0);
      });
    }
    // Snapshot for all tokens at this point
    Object.keys(running).forEach(token => {
      if (!cumulative[token]) cumulative[token] = [];
      cumulative[token][i] = running[token];
    });
  });
  // Fill missing values for earlier points
  Object.keys(cumulative).forEach(token => {
    for (let i = 0; i < txs.length; ++i) {
      if (cumulative[token][i] === undefined) cumulative[token][i] = i > 0 ? cumulative[token][i-1] : 0;
    }
  });
  return cumulative;
}

// Helper: transaction heatmap data
function getTokenUsageByDay(txs: Transaction[]) {
  const map: Record<string, Record<string, number>> = {};
  txs.forEach(tx => {
    if (tx.type === "swap" && tx.details.tokens) {
      const day = new Date(tx.details.timestamp).toLocaleDateString();
      if (!map[day]) map[day] = {};
      tx.details.tokens.forEach(token => {
        map[day][token] = (map[day][token] || 0) + 1;
      });
    }
  });
  // Output: [{ date:..., USDC: 3, UNI: 1, ... }, ...]
  return Object.entries(map).map(([date, obj]) => ({ date, ...obj }));
}

function aggregateBalances(transactions: Transaction[]) {
  const balances: Record<string, number> = {};
  transactions.forEach(tx => {
    if (tx.type === "swap" && tx.details.tokens && tx.details.amounts) {
      tx.details.tokens.forEach((token, idx) => {
        const amt = Number(tx.details.amounts?.[idx] ?? 0);
        balances[token] = (balances[token] || 0) + amt;
      });
    }
  });
  return balances;
}

// New helper: find the index of the last swap transaction
function getLastSwapIndex(txs: Transaction[]) {
  for (let i = txs.length - 1; i >= 0; --i) {
    if (txs[i].type === "swap") return i;
  }
  return -1;
}

export async function GET() {
  const txs = await getAllTransactions();

  // Find last swap index
  const lastSwapIdx = getLastSwapIndex(txs);

  // All swaps up to (but not including) the last swap
  const beforeTxs = lastSwapIdx > 0 ? txs.slice(0, lastSwapIdx) : [];
  const balancesBefore = aggregateBalances(beforeTxs);
  const balancesNow = aggregateBalances(txs);

  const balanceChange: Record<string, number> = {};
  Object.keys(balancesNow).forEach(token => {
    balanceChange[token] = (balancesNow[token] || 0) - (balancesBefore[token] || 0);
  });

  // -- Additional chart data
  const perTokenCumulative = getPerTokenCumulative(txs);
  const heatmapData = getTokenUsageByDay(txs);

  // Scatter: amount vs. time
  const scatter = txs
    .filter(
      (tx): tx is Transaction & { details: { tokens: string[]; amounts: string[]; timestamp: number } } =>
        tx.type === "swap" &&
        Array.isArray((tx.details as { tokens?: string[] }).tokens) &&
        Array.isArray((tx.details as { amounts?: string[] }).amounts)
    )
    .flatMap((tx) =>
      tx.details.tokens.map((token: string, idx: number) => ({
        token,
        amount: Number(tx.details.amounts?.[idx] ?? 0),
        date: new Date(tx.details.timestamp).toLocaleString(),
        txId: tx.id,
      }))
    );

  // Timeline: show last N actions (type, token, date)
  const timeline = txs
    .map(tx => ({
      type: tx.type,
      date: tx.type === "swap" ? new Date(tx.details.timestamp).toLocaleString() : new Date(tx.details.timestamp).toLocaleString(),
      tokens: tx.type === "swap" ? (tx.details.tokens ?? []) : [],
      amount: tx.type === "swap" && tx.details.amounts ? tx.details.amounts.map(Number).reduce((a, b) => a + b, 0) : 0,
      desc: tx.type === "stake" ? tx.details.userInput : undefined,
    }))
    .reverse()
    .slice(0, 8);

  // Doughnut: Transaction type proportions
  const totalCount = txs.length;
  const doughnut = [
    { type: "swap", value: txs.filter(tx => tx.type === "swap").length / totalCount },
    { type: "stake", value: txs.filter(tx => tx.type === "stake").length / totalCount },
  ];

  // Prepare chart data
  const chartData = {
    pie: Object.entries(balancesNow).map(([token, value]) => ({ token, value })),
    bar: Object.entries(balanceChange).map(([token, value]) => ({ token, value })),
    line: txs.map((tx, i) => ({
      index: i + 1,
      total: Object.values(aggregateBalances(txs.slice(0, i + 1))).reduce((a, b) => a + b, 0),
    })),
    time: txs
      .filter(tx => tx.type === "swap")
      .map(tx => ({
        date: new Date(tx.details.timestamp).toLocaleDateString(),
        value: tx.details.amounts?.reduce((sum, amt) => sum + Number(amt), 0) || 0,
      })),
    tokenDistribution: Object.entries(balancesNow).map(([token, value]) => ({ token, value })),
    transactionTypes: [
      { type: "swap", count: txs.filter(tx => tx.type === "swap").length },
      { type: "stake", count: txs.filter(tx => tx.type === "stake").length },
    ],
    tokensPerDay: (() => {
      const map: Record<string, Record<string, number>> = {};
      txs.forEach(tx => {
        if (tx.type === "swap" && tx.details.tokens && tx.details.amounts) {
          const date = new Date(tx.details.timestamp).toLocaleDateString();
          if (!map[date]) map[date] = {};
          tx.details.tokens.forEach((token, idx) => {
            const amt = Number(tx.details.amounts?.[idx] ?? 0);
            map[date][token] = (map[date][token] || 0) + amt;
          });
        }
      });
      return Object.entries(map).map(([date, tokens]) => ({ date, ...tokens }));
    })(),
    // New charts:
    perTokenCumulative,
    heatmapData,
    scatter,
    timeline,
    doughnut,
  };

  return NextResponse.json({
    balancesNow,
    balancesBefore,
    balanceChange,
    chartData,
    transactions: txs,
  });
}
