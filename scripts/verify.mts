import rawData from "../src/data/proposal_data.json" with { type: "json" };
import { build, selfCheck, toHtml } from "../src/lib/proposal";
import { funnelSvg, gapSvg, trendSvg } from "../src/lib/charts";
import type { ProposalData } from "../src/data/types";

const data = rawData as unknown as ProposalData;
const topics = data.topics;

console.log(`topics: ${topics.length}`);

let allOk = true;
for (const topic of topics) {
  const evidence = data.evidence[topic.키];
  const human = { 위험: "테스트 위험 문구", 요청: "승인해 주십시오." };
  const secs = build(topic, evidence, human);
  const issues = selfCheck(secs);
  if (issues.length) {
    allOk = false;
    console.log(`FAIL ${topic.제목}:`, issues);
  }
  // charts must not throw
  if (evidence.현황.퍼널) funnelSvg(evidence.현황.퍼널);
  if (evidence.원인.표) gapSvg(evidence.원인.표);
  for (const s of secs) {
    if (s.차트 === "trend" && s._추세 && "월별" in s._추세 && (s._추세 as any).월별) {
      trendSvg((s._추세 as any).월별, 30);
    }
  }
}
console.log("ALL SELF_CHECK CLEAN:", allOk);

// Cross-check top topic's exact sentences against known-good Python output
const top = topics[0];
const ev = data.evidence[top.키];
const secs = build(
  top,
  ev,
  {
    위험:
      "가격 계산기가 예산에 민감한 리드만 필터링해 오히려 파이프라인 자체가 줄어들 수 있습니다. 2주 A/B 테스트 후 데모신청→계약체결 전환율(가드레일, 현재 32.7%)이 하락하면 즉시 롤백합니다.",
    요청: "위 가격 투명성 계산기 도입을 승인해 주십시오.",
  }
);
console.log("\n=== TOP TOPIC:", top.제목, "===");
for (const s of secs) {
  console.log("---", s.제목);
  for (const t of s.문장) console.log(" ", t);
}

const svgs = {
  funnel: ev.현황.퍼널 ? funnelSvg(ev.현황.퍼널) : "",
  gap: ev.원인.표 ? gapSvg(ev.원인.표) : "",
  trend: "",
};
for (const s of secs) {
  if (s.차트 === "trend" && s._추세 && "월별" in s._추세 && (s._추세 as any).월별) {
    svgs.trend = trendSvg((s._추세 as any).월별, 30);
  }
}
const html = toHtml(secs, `제안서 — ${top.제목}`, svgs);
console.log("\nHTML length:", html.length);
console.log("self_check:", selfCheck(secs));
