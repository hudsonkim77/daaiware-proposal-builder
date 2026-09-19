// report/proposal.py 를 그대로 옮긴 것 — 절 목록·문장 템플릿을 바꾸면 두 파일 다 바꾼다.
import { PROPOSAL_WORDS as W } from "../data/config";
import { cardFor } from "../data/cards";
import type { Evidence, Topic } from "../data/types";

export interface Section {
  제목: string;
  질문: string;
  kind: "auto" | "human";
  문장: string[];
  차트: "funnel" | "gap" | "trend" | null;
  _추세?: Evidence["추세"];
  _결정동사있음?: boolean | null;
}

export interface HumanInput {
  위험: string;
  요청: string;
}

// 마지막 글자 받침 유무로 '로'/'으로' 조사를 고른다(받침 없음 또는 ㄹ받침이면 '로').
function ro(word: string): string {
  if (!word) return "로";
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "로";
  const jong = code % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function build(topic: Topic, evidence: Evidence, human: HumanInput): Section[] {
  const secs: Section[] = [];

  const 현황 = evidence.현황 || { 퍼널: null, 사유: null };
  const 구간 = topic.구간;
  const [fromS, toS] = 구간 && 구간.includes("→") ? 구간.split("→") : [null, null];

  if (현황.퍼널 && fromS) {
    const rows = 현황.퍼널;
    const fromR = rows.find((r) => r.단계 === fromS);
    const toR = rows.find((r) => r.단계 === toS);
    if (fromR && toR) {
      const rates = rows.slice(1).map((r, i) => ({ name: `${rows[i].단계}→${r.단계}`, rate: r.전단계대비 }));
      const order = [...rates].sort((a, b) => a.rate - b.rate);
      const rank = order.findIndex((o) => o.name === `${fromS}→${toS}`) + 1;
      const orderLen = order.length;
      const worst구간 = order[0].name;
      const 문장 = [
        `${fromS}에서 ${toS}${ro(toS!)} 넘어가는 것은 ${fmt(fromR.도달)}건 중 ${fmt(toR.도달)}건입니다(${toR.전단계대비.toFixed(1)}%).`,
        rank > 1
          ? `전체 ${orderLen}개 구간 중 이 구간 전환율이 ${rank}번째로 낮습니다.`
          : `전체 ${orderLen}개 구간 중 이 구간 전환율이 가장 낮습니다.`,
      ];
      if (rank > 1) {
        문장.push(`참고: 전환율만 보면 ${worst구간} 구간이 가장 낮지만, 이 주제는 다음 절의 연간 환산 규모 기준으로 채택된 것입니다.`);
      }
      secs.push({ 제목: W.섹션_현황, 질문: W.섹션_현황, kind: "auto", 문장, 차트: "funnel" });
    }
  }

  const 원인 = evidence.원인 || { 축: null, 표: null };
  if (원인.표 && 원인.표.length > 0) {
    const 표 = 원인.표;
    const best = 표.find((r) => r.최고)!;
    const worst = 표.find((r) => r.최저)!;
    const 문장 = [
      `${원인.축}${ro(원인.축!)} 나누면 '${worst.칸}'는 ${worst.전환율.toFixed(1)}%인데 '${best.칸}'는 ${best.전환율.toFixed(1)}%로 ${(best.전환율 - worst.전환율).toFixed(1)}%p 벌어집니다.`,
    ];
    secs.push({ 제목: W.섹션_원인, 질문: W.섹션_원인, kind: "auto", 문장, 차트: "gap" });
  }

  const 규모 = evidence.규모;
  let 추세: Evidence["추세"] | undefined;
  if (규모 && 규모.연간건수 !== null && 규모.연간건수 !== undefined) {
    const 가정 = (규모.가정 || []).join("; ");
    const 문장 = [`이 격차가 유지된다고 보면 연 ${fmt(규모.연간건수)}건 규모입니다(${가정}).`];
    추세 = evidence.추세;
    const hasMonthly = 추세 && "월별" in 추세 && (추세 as any).월별;
    secs.push({ 제목: W.섹션_규모, 질문: W.섹션_규모, kind: "auto", 문장, 차트: hasMonthly ? "trend" : null, _추세: 추세 });
  }

  const 카드 = cardFor(topic);
  let 제안문장: string[];
  if (카드) {
    제안문장 = [`${카드.이름}을 제안합니다.`];
    if (카드.확신도) 제안문장.push(`확신도 — ${카드.확신도}.`);
    if (카드.비용_확인계획) {
      const [무엇, 누가, 결정] = 카드.비용_확인계획;
      제안문장.push(`비용은 아직 확정치가 아닙니다 — [모르는 것: ${무엇}] [확인 주체: ${누가}] [모르는 채로 할 수 있는 결정: ${결정}].`);
    } else {
      제안문장.push(`비용: ${카드.비용}.`);
    }
    let 효과문장 = `효과: ${카드.효과}.`;
    if (카드.매출환산) {
      const 가정 = 카드.매출환산.가정사슬.join("; ");
      효과문장 += ` 참고(확정 아님, 가정 결합): 매출로 환산하면 ${카드.매출환산.값} 수준(${가정}).`;
    }
    제안문장.push(효과문장);
    if (카드.되돌림_1차) {
      제안문장.push(`되돌림 조건(1차, 대상 지표 자체): ${카드.되돌림_1차}. ${카드.되돌림_2차_안내}.`);
    } else {
      제안문장.push(`되돌림 조건: ${카드.되돌림}.`);
    }
  } else {
    제안문장 = [
      "이 주제에는 아직 승인된 제안 카드가 없습니다.",
      "원인·규모만으로는 구체적 개입안을 제시하지 않습니다 — 카드 설계가 먼저입니다.",
    ];
  }
  secs.push({ 제목: W.섹션_제안, 질문: W.섹션_제안, kind: "auto", 문장: 제안문장, 차트: null });

  secs.push({ 제목: W.섹션_위험, 질문: W.섹션_위험, kind: "human", 문장: [human.위험 || ""], 차트: null });

  const 규모건수 = 규모?.연간건수 ?? 0;
  const 분기누적 = 규모건수 ? Math.round(규모건수 / 4) : 0;
  const 자동요청줄 = [
    `이 주제의 규모: 연 ${fmt(규모건수)}건.`,
    `${W.판정_승인} / ${W.판정_조건부} / ${W.판정_보류} 중 하나를 선택해 주십시오.`,
    `결정을 한 분기 미루면 약 ${fmt(분기누적)}건이 그대로 누적됩니다(연 ${fmt(규모건수)}건 추정치를 4분기로 나눈 것 — 위 '규모' 절의 가정을 그대로 이어받음).`,
  ];
  const 요청문장 = human.요청 || "";
  const 결정동사있음 = ["승인", "결정", "판단", "보류"].some((v) => 요청문장.includes(v));
  secs.push({
    제목: W.섹션_요청,
    질문: W.섹션_요청,
    kind: "human",
    문장: [요청문장, ...자동요청줄],
    차트: null,
    _결정동사있음: 요청문장 ? 결정동사있음 : null,
  });

  return secs.filter((s) => s.문장.some((t) => t.trim()));
}

export function selfCheck(secs: Section[]): string[] {
  const issues: string[] = [];
  const 빈칸 = secs.reduce((acc, s) => acc + s.문장.filter((t) => !t.trim()).length, 0);
  if (빈칸) issues.push(`빈칸 ${빈칸}개`);
  if (secs.length > 7) issues.push(`절 개수 ${secs.length}개 — 7개 초과`);
  const 요청 = secs.find((s) => s.제목 === W.섹션_요청);
  if (요청 && 요청._결정동사있음 !== true) {
    issues.push("마지막 절(요청)에 결정을 요구하는 동사가 없거나 비어 있음");
  }
  for (const s of secs) {
    if (s.차트 && !["funnel", "gap", "trend"].includes(s.차트)) {
      issues.push(`'${s.제목}' 절에 알 수 없는 차트 지정: ${s.차트}`);
    }
  }
  return issues;
}

export function toHtml(secs: Section[], title: string, svgs: Record<string, string>): string {
  const ink = "#0f172a", muted = "#64748b", accent = "#2a78d6";
  const body = secs
    .filter((s) => s.문장.some((t) => t.trim()))
    .map((s) => {
      const chartHtml = s.차트 ? svgs[s.차트] || "" : "";
      const 문단 = s.문장
        .filter((t) => t.trim())
        .map((t) => `<p>${t}</p>`)
        .join("");
      return `
<section style="page-break-after:avoid; margin-bottom:22px;">
  <h2 style="font-size:15px; margin:0 0 2px;">${s.제목}</h2>
  <div style="font-size:11px; color:${muted}; margin-bottom:8px;">이 절이 답하는 질문: ${s.질문}</div>
  <div style="font-size:10.5px; line-height:1.65;">${문단}</div>
  ${chartHtml}
</section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>${title}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
body { font-family: -apple-system, "Malgun Gothic", sans-serif; color:${ink}; font-size:10.5px; }
h1 { font-size:18px; margin:0 0 4px; }
.summary { border:1px solid #e2e8f0; border-left:4px solid ${accent}; border-radius:4px; padding:12px 16px; margin:12px 0 24px; background:#f8fafc; }
table { border-collapse:collapse; width:100%; margin:6px 0; }
th, td { border-bottom:1px solid #e2e8f0; padding:4px 8px; text-align:left; font-size:10px; }
th { background:#f1f5f9; }
</style></head>
<body>
<h1>${title}</h1>
<div class="summary">한 장 요약 — 아래 절의 순서(현황→원인→규모→제안→위험·철회 기준→요청)를 그대로 압축한 것입니다.</div>
${body}
</body></html>`;
}
