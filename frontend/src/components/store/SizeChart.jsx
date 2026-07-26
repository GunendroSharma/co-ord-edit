import React, { useState } from "react";
import { X, Ruler } from "lucide-react";

const CHARTS = {
  default: {
    title: "Size Chart",
    intro: "All measurements in inches. Pieces are cut generously — for a snug fit, size down by one.",
    columns: ["Bust", "Waist", "Hip", "Length"],
    rows: [
      { size: "XS", values: ["33", "26", "36", "38"] },
      { size: "S", values: ["35", "28", "38", "39"] },
      { size: "M", values: ["37", "30", "40", "40"] },
      { size: "L", values: ["39", "32", "42", "41"] },
      { size: "XL", values: ["41", "34", "44", "42"] },
    ],
    tips: [
      "The model is 5'7 wearing a size S.",
      "Hand-embroidered pieces may have a 0.5\" variance.",
      "For between-sizes, we recommend the larger — most silhouettes drape better.",
    ],
  },
  "co-ord-sets": {
    title: "Co-ord Set Size Guide",
    intro: "Top + bottom sold together. Both pieces match the same size.",
    columns: ["Bust", "Waist", "Hip", "Top Length", "Bottom Length"],
    rows: [
      { size: "XS", values: ["33", "26", "36", "24", "38"] },
      { size: "S", values: ["35", "28", "38", "25", "39"] },
      { size: "M", values: ["37", "30", "40", "26", "40"] },
      { size: "L", values: ["39", "32", "42", "27", "41"] },
      { size: "XL", values: ["41", "34", "44", "28", "42"] },
    ],
    tips: [
      "Elasticated waistband on the bottoms adjusts by 2\".",
      "Fit is relaxed and drapey through the body.",
      "Fabric is 100% cotton — allow for 1–2% shrinkage on first wash.",
    ],
  },
  kaftans: {
    title: "Kaftan Size Guide",
    intro: "Kaftans are cut oversized and free-flowing.",
    columns: ["Bust (Flat)", "Length", "Sleeve"],
    rows: [
      { size: "One Size", values: ["Up to 42", "50", "24"] },
    ],
    tips: [
      "Free-size kaftan fits up to bust 42\".",
      "Belt included — cinch at natural waist for a shape.",
    ],
  },
};

export function SizeChartTrigger({ category, testid = "pdp-size-chart-btn" }) {
  const [open, setOpen] = useState(false);
  const chart = CHARTS[category] || CHARTS.default;
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-4 text-sm inline-flex items-center gap-2 text-[color:var(--sf-text-soft)] hover-underline" data-testid={testid}>
        <Ruler size={15} strokeWidth={1.5} /> Size Guide
      </button>
      {open && (
        <div className="fixed inset-0 z-50" data-testid="size-chart-drawer">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <div className="overline text-[color:var(--sf-text-soft)]">Fit & Sizing</div>
                <h3 className="font-serif-display text-2xl mt-1">{chart.title}</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" data-testid="size-chart-close"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-[color:var(--sf-text-soft)] mb-6">{chart.intro}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3 font-medium">Size</th>
                      {chart.columns.map((c) => <th key={c} className="text-left py-2 pr-3 font-medium">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((r) => (
                      <tr key={r.size} className="border-b">
                        <td className="py-2 pr-3 font-medium">{r.size}</td>
                        {r.values.map((v, i) => <td key={i} className="py-2 pr-3 text-[color:var(--sf-text-soft)]">{v}"</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-8">
                <div className="overline mb-3">Fit tips</div>
                <ul className="space-y-2 text-sm text-[color:var(--sf-text-soft)]">
                  {chart.tips.map((t, i) => <li key={i} className="flex gap-2"><span>·</span><span>{t}</span></li>)}
                </ul>
              </div>
              <div className="mt-8 p-4 bg-[color:var(--sf-secondary)] text-sm">
                <b>How to measure</b>
                <p className="mt-2 text-[color:var(--sf-text-soft)]">Stand relaxed. Measure snugly (not tight) across the fullest part of your bust, natural waist and hip. Use a fabric tape.</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
