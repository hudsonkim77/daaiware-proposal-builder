// viz/proposal_charts.py 를 그대로 옮긴 것 — 인라인 SVG 문자열. 로직을 바꾸면 두 파일 다 바꾼다.
import { COLORS } from "../data/config";
import type { FunnelRow, GapRow, MonthlyPoint } from "../data/types";

const FONT = 'font-family="-apple-system,Malgun Gothic,sans-serif"';

function figure(svgBody: string, width: number, height: number, caption: string): string {
  return (
    `<figure style="margin:0">` +
    `<svg viewBox="0 0 ${width} ${height}" width="100%" xmlns="http://www.w3.org/2000/svg" ${FONT}>${svgBody}</svg>` +
    `<figcaption style="font-size:11px;color:#64748b;margin-top:4px">${caption}</figcaption>` +
    `</figure>`
  );
}

export function funnelSvg(rows: FunnelRow[]): string {
  const steps = rows.map((r) => r.단계);
  const counts = rows.map((r) => r.도달);
  if (counts.length === 0 || Math.max(...counts) === 0) return "";
  const drops = counts.slice(1).map((c, i) => counts[i] - c);
  const bottleneck = drops.indexOf(Math.max(...drops)) + 1;
  const highlight = new Set([bottleneck - 1, bottleneck]);

  const width = 640, barH = 26, gap = 13, left = 156, right = 78, top = 16;
  const height = top * 2 + steps.length * (barH + gap) - gap;
  const maxC = Math.max(...counts);
  const parts: string[] = [];
  steps.forEach((s, i) => {
    const c = counts[i];
    const y = top + i * (barH + gap);
    const w = Math.max((c / maxC) * (width - left - right), 1);
    const color = highlight.has(i) ? COLORS.accent : COLORS.base;
    parts.push(`<text x="${left - 10}" y="${(y + barH * 0.68).toFixed(1)}" text-anchor="end" font-size="12.5" fill="#0f172a">${s}</text>`);
    parts.push(`<rect x="${left}" y="${y}" width="${w.toFixed(1)}" height="${barH}" fill="${color}" rx="3"/>`);
    parts.push(`<text x="${(left + w + 8).toFixed(1)}" y="${(y + barH * 0.68).toFixed(1)}" font-size="12" fill="#334155">${c.toLocaleString()}명</text>`);
  });
  const caption = `그레인: 계정(회사) 고유 수 · 병목 구간: ${steps[bottleneck - 1]}→${steps[bottleneck]}`;
  return figure(parts.join(""), width, height, caption);
}

export function gapSvg(rows: GapRow[]): string {
  if (rows.length === 0) return "";
  const width = 640, barH = 24, gap = 12, left = 120, right = 90, top = 16;
  const height = top * 2 + rows.length * (barH + gap) - gap;
  const maxRate = Math.max(...rows.map((r) => r.전환율)) || 1;
  const parts: string[] = [];
  rows.forEach((r, i) => {
    const y = top + i * (barH + gap);
    const w = Math.max((r.전환율 / maxRate) * (width - left - right), 1);
    const color = r.최고 ? COLORS.accent : r.최저 ? COLORS.danger : COLORS.gray;
    parts.push(`<text x="${left - 10}" y="${(y + barH * 0.68).toFixed(1)}" text-anchor="end" font-size="12.5" fill="#0f172a">${r.칸}</text>`);
    parts.push(`<rect x="${left}" y="${y}" width="${w.toFixed(1)}" height="${barH}" fill="${color}" rx="3"/>`);
    parts.push(`<text x="${(left + w + 8).toFixed(1)}" y="${(y + barH * 0.68).toFixed(1)}" font-size="12" fill="#334155">${r.전환율.toFixed(1)}%</text>`);
  });
  const caption = "그레인: 계정(회사) 고유 수 기준 구간전환율 · 강조=최고, 위험색=최저, 회색=나머지";
  return figure(parts.join(""), width, height, caption);
}

export function trendSvg(monthly: MonthlyPoint[], warnLine: number | null = null): string {
  const pts = monthly.filter((p) => p.전환율 !== null) as { 월: string; 전환율: number; 분모: number }[];
  if (pts.length < 2) return "";
  const width = 640, height = 260, left = 60, right = 30, top = 20, bottom = 36;
  const plotW = width - left - right, plotH = height - top - bottom;
  const values = pts.map((p) => p.전환율).concat(warnLine !== null ? [warnLine] : []);
  const vMin = Math.min(...values) * 0.9, vMax = Math.max(...values) * 1.1;

  const xy = (i: number, v: number): [number, number] => {
    const x = left + (i / (pts.length - 1)) * plotW;
    const y = top + (1 - (v - vMin) / (vMax - vMin)) * plotH;
    return [x, y];
  };

  const coords = pts.map((p, i) => xy(i, p.전환율));
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const parts: string[] = [`<line x1="${left}" y1="${top + plotH}" x2="${left + plotW}" y2="${top + plotH}" stroke="#cbd5e1"/>`];
  if (warnLine !== null) {
    const wy = top + (1 - (warnLine - vMin) / (vMax - vMin)) * plotH;
    parts.push(`<line x1="${left}" y1="${wy.toFixed(1)}" x2="${left + plotW}" y2="${wy.toFixed(1)}" stroke="${COLORS.danger}" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<text x="${left + plotW}" y="${(wy - 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${COLORS.danger}">경고선 ${warnLine.toFixed(0)}%</text>`);
  }
  parts.push(`<path d="${path}" fill="none" stroke="${COLORS.accent}" stroke-width="2.5"/>`);
  coords.forEach(([x, y], i) => {
    const p = pts[i];
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${COLORS.accent}"/>`);
    parts.push(`<text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle" font-size="11" fill="#334155">${p.전환율.toFixed(1)}%</text>`);
    parts.push(`<text x="${x.toFixed(1)}" y="${top + plotH + 18}" text-anchor="middle" font-size="10.5" fill="#64748b">${p.월.slice(-2)}월</text>`);
  });
  const caption = "그레인: 월별 계정 고유 수 기준 구간전환율 · 표본 부족한 달은 점을 찍지 않음(0%로 표시하지 않음)";
  return figure(parts.join(""), width, height, caption);
}
