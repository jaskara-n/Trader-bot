"use client";
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter,
  ResponsiveContainer
} from "recharts";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const COLORS = ["#6E41E2", "#41E2C1", "#E241A1", "#E2B441", "#41A1E2", "#E26E41"];

interface ChartData {
  pie: Array<{ token: string; value: number }>;
  bar: Array<{ token: string; value: number }>;
  line: Array<{ index: number; total: number }>;
  time: Array<{ date: string; value: number }>;
  tokenDistribution: Array<{ token: string; value: number }>;
  transactionTypes: Array<{ type: string; count: number }>;
  perTokenCumulative: Record<string, number[]>;
  heatmapData: Array<Record<string, string | number>>;
  scatter: Array<{ x: number; y: number; token: string }>;
  doughnut: Array<{ token: string; value: number }>;
  timeline: Array<{ date: string; value: number; type: string; tokens?: string[]; amount?: number; desc?: string }>;
}

interface AnalysisData {
  balancesNow: Record<string, string>;
  balancesBefore: Record<string, string>;
  balanceChange: Record<string, string>;
  chartData: ChartData;
  transactions: Array<unknown>;
}

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchData = () => {
    setIsLoading(true);
    fetch("/api/transactions")
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData(); // Initial data fetch
  }, []);

  if (!data && isLoading) return <div className="flex items-center justify-center h-screen bg-[#121212] text-white">Loading...</div>;
  if (!data) return null; // Or a minimal loading indicator if initial fetch is not yet complete

  const { balancesNow, balancesBefore, balanceChange, chartData } = data;

  // Stacked area chart safe
const areaData = Object.keys(chartData.perTokenCumulative).length
  ? Array.from({ length: data.transactions.length }, (_, idx) => ({
      index: idx + 1,
      ...Object.entries(chartData.perTokenCumulative).reduce(
        (acc, [token, arr]) => ({
          ...acc,
          [token]: (arr as number[])[idx],
        }),
        {} as Record<string, number>
      ),
    }))
  : [];

  // Heatmap table
  const heatmapTokens: string[] = Array.from(new Set<string>(chartData.heatmapData.flatMap((d: Record<string, string | number>) => Object.keys(d).filter((k: string) => k !== "date"))));

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#121212] w-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 text-white text-2xl">
          Loading...
        </div>
      )}
      {/* Centered, prominent heading for full width */}
      <div className="w-full flex flex-col items-center my-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight text-center px-4">
            Portfolio Analysis Report
          </h1>
        <div className="w-3/4 h-1 bg-[#8b5cf6] mt-2"></div> {/* Underline */}
        </div>

      {/* Refresh Button */}
      <button
        onClick={fetchData}
        className="absolute top-4 right-4 p-2 rounded-full bg-[#191919] text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 z-10"
        aria-label="Refresh Data"
      >
        <ArrowPathIcon className="w-6 h-6" />
      </button>

      <div className="w-full max-w-7xl px-8 mb-8">
        {/* All charts in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Pie Chart: Token Distribution */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Token Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
              <Pie data={chartData.pie} dataKey="value"  nameKey="token" cx="50%" cy="50%" outerRadius={80} label>
                {chartData.pie.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart: Balance Change */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Balance Change</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.bar}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="token" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#41E2C1" />
            </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Line Chart: Total Balance Over Time */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Total Balance Over Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData.line}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#6E41E2" />
            </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Area Chart: Transaction Value Over Time */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Transaction Value Over Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData.time}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E241A1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#E241A1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#E241A1" fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Radar Chart: Token Distribution */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Radar: Token Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.tokenDistribution}>
              <PolarGrid />
              <PolarAngleAxis dataKey="token" />
              <PolarRadiusAxis />
              <Radar name="Tokens" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart: Transaction Types */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Transaction Types</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.transactionTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#E2B441" />
            </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Stacked Area Chart: Per Token Cumulative */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800 md:col-span-2 lg:col-span-3">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Cumulative Balance Per Token</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={areaData}>
              <defs>
                  {Object.keys(chartData.perTokenCumulative).map((token: string, idx: number) => (
                  <linearGradient key={token} id={`color-${token}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="index" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
                {Object.keys(chartData.perTokenCumulative).map((token: string, idx: number) => (
                <Area
                  key={token}
                  type="monotone"
                  dataKey={token}
                  stackId="1"
                  stroke={COLORS[idx % COLORS.length]}
                  fill={`url(#color-${token})`}
                  fillOpacity={1}
                />
              ))}
            </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Scatter Chart: Amount vs. Time */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Transaction Amount vs. Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" name="Date" tick={false} />
              <YAxis dataKey="amount" name="Amount" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {Array.from(new Set<string>(chartData.scatter.map((d) => d.token))).map((token: string, idx: number) => (
            <Scatter
                  key={token}
                  name={token}
                data={chartData.scatter.filter((d) => d.token === token)}
                fill={COLORS[idx % COLORS.length]}
            />
            ))}

              <Legend />
            </ScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Doughnut Chart (Pie for proportions) */}
          <div className="bg-[#191919] p-4 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Transaction Type Proportions</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
              <Pie
                data={chartData.doughnut}
                dataKey="value"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                label
              >
                {chartData.doughnut.map((entry, idx) => (
                  <Cell key={`cell-doughnut-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Heatmap Table */}
          <div className="bg-[#191919] rounded-xl p-4 shadow-lg border border-gray-800 overflow-auto md:col-span-2 lg:col-span-3">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Token Usage Heatmap (per day)</h2>
            <table className="table-auto w-full text-white text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 border-b border-gray-700 text-left">Date</th>
                  {heatmapTokens.map((token: string) => (
                    <th key={token} className="px-2 py-1 border-b border-gray-700 text-left">{token}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.heatmapData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-1 border-b border-gray-800">{row.date}</td>
                    {heatmapTokens.map((token: string) => (
                      <td
                        key={token}
                        className="px-2 py-1 border-b border-gray-800"
                        style={{
                          background: row[token] ? `rgba(110,65,226,${0.2 + 0.15 * Math.min(Number(row[token]), 4)})` : 'transparent'
                        }}
                      >
                        {row[token] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Timeline */}
          <div className="bg-[#191919] rounded-xl p-4 shadow-lg border border-gray-800 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-lg mb-2 px-4 text-white font-semibold">Recent Activity Timeline</h2>
            <ul className="divide-y divide-gray-700 text-white">
              {chartData.timeline.map((item, idx) => (
                <li key={idx} className="py-2 flex items-start gap-4">
                  <span className="inline-block font-bold capitalize min-w-[60px]">{item.type}</span>
                  <span className="inline-block">{item.tokens?.join(", ")}</span>
                  <span className="inline-block font-mono text-xs">{item.date}</span>
                  <span className="inline-block ml-auto text-purple-300">{item.amount && item.amount > 0 ? `+${item.amount}` : ""}</span>
                  {item.type === "stake" && <span className="text-gray-400 italic ml-2">{item.desc}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Balances Summary */}
        <div className="mt-8 mb-7 text-white">
          <h2 className="text-lg font-semibold text-center py-5 mb-2">Balances Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-bold">Current Balance</h3>
              <pre className="bg-[#2A2A2A] rounded p-2">{JSON.stringify(balancesNow, null, 2)}</pre>
            </div>
            <div>
              <h3 className="font-bold">Balance Before</h3>
              <pre className="bg-[#2A2A2A] rounded p-2">{JSON.stringify(balancesBefore, null, 2)}</pre>
            </div>
            <div>
              <h3 className="font-bold">Balance Change</h3>
              <pre className="bg-[#2A2A2A] rounded p-2">{JSON.stringify(balanceChange, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
