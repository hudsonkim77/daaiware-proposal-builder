// pages/5_제안서.py 의 화면 로직을 그대로 옮긴 것 — 계산은 build()/selfCheck()/toHtml()이, 데이터는 정적 JSON이 맡는다.
import "./style.css";
import rawData from "./data/proposal_data.json";
import { THRESHOLDS } from "./data/config";
import { build, selfCheck, toHtml, type HumanInput, type Section } from "./lib/proposal";
import { funnelSvg, gapSvg, trendSvg } from "./lib/charts";
import type { Evidence, ProposalData, Topic } from "./data/types";
import { WEEK9_NOTES_HTML } from "./content/week9notes";

const data = rawData as unknown as ProposalData;
const topics: Topic[] = data.topics;

const app = document.querySelector<HTMLDivElement>("#app")!;

function topicLabel(t: Topic): string {
  const 표시 = t.규모_연간건수 ? `연 ${t.규모_연간건수.toLocaleString()}건` : "규모 미상";
  return `${t.제목} · ${표시}` + (t.기각사유 ? " (차이 없음)" : "");
}

function warnLineFor(구간: string | null): number | null {
  if (!구간) return null;
  for (const t of Object.values(THRESHOLDS)) {
    if (t.from_step && `${t.from_step}→${t.to_step}` === 구간) return t.warn;
  }
  return null;
}

function renderCandidateTable(): string {
  const rows = topics
    .map(
      (t) => `<tr>
        <td>${t.제목}</td>
        <td class="num">${t.규모_연간건수.toLocaleString()}</td>
        <td>${t.기각사유 ? "기각" : "채택"}</td>
        <td class="muted">${t.기각사유 || "—"}</td>
      </tr>`
    )
    .join("");
  return `<table><thead><tr><th>주제</th><th>연간 규모</th><th>채택 여부</th><th>사유</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function sectionCard(s: Section, evidence: Evidence): string {
  const icon = s.kind === "auto" ? "🤖" : "🙋";
  const paras = s.문장
    .filter((t) => t.trim())
    .map((t) => `<p>${t}</p>`)
    .join("");
  let chart = "";
  if (s.차트 === "funnel" && evidence.현황.퍼널) chart = funnelSvg(evidence.현황.퍼널);
  else if (s.차트 === "gap" && evidence.원인.표) chart = gapSvg(evidence.원인.표);
  else if (s.차트 === "trend" && s._추세 && "월별" in s._추세 && s._추세.월별) {
    chart = trendSvg(s._추세.월별, warnLineFor(s._추세.구간 ?? null));
  }
  return `<div class="section-card">
    <div class="section-head">${icon} <strong>${s.제목}</strong> <span class="muted">· 이 절이 답하는 질문: ${s.질문}</span></div>
    <div class="section-body">${paras}</div>
    ${chart}
  </div>`;
}

function chartsFor(secs: Section[], evidence: Evidence): Record<string, string> {
  const svgs: Record<string, string> = {};
  if (evidence.현황.퍼널) svgs.funnel = funnelSvg(evidence.현황.퍼널);
  if (evidence.원인.표) svgs.gap = gapSvg(evidence.원인.표);
  for (const s of secs) {
    if (s.차트 === "trend" && s._추세 && "월별" in s._추세 && s._추세.월별) {
      svgs.trend = trendSvg(s._추세.월별, warnLineFor(s._추세.구간 ?? null));
    }
  }
  return svgs;
}

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

let selectedIndex = -1; // -1 = 아직 선택 안 함
const human: HumanInput = { 위험: "", 요청: "" };

function render() {
  const options = [`— 주제를 고르세요 (전체 후보 먼저 보기) —`, ...topics.map(topicLabel)];

  app.innerHTML = `
    <div class="wrap">
      <div class="page-head">
        <div>
          <h1>제안서</h1>
          <p class="caption">리포트가 아니라 결재 문서입니다 — 계산 과정 없이, 승인/조건부 승인/보류를 요청하는 것으로 끝납니다.</p>
        </div>
        <button id="week9-btn" class="ghost-btn" type="button">9주차 적용 포인트</button>
      </div>

      <dialog id="week9-modal">
        <div class="modal-head">
          <h2>9주차 적용 포인트</h2>
          <button id="week9-close" class="icon-btn" type="button" aria-label="닫기">✕</button>
        </div>
        <div class="modal-body">${WEEK9_NOTES_HTML}</div>
      </dialog>

      <label class="field-label" for="topic-select">주제</label>
      <select id="topic-select">
        ${options.map((o, i) => `<option value="${i - 1}" ${i - 1 === selectedIndex ? "selected" : ""}>${o}</option>`).join("")}
      </select>

      <details id="candidates" ${selectedIndex === -1 ? "open" : ""}>
        <summary>전체 후보 ${topics.length}개 (기각된 것도 포함 — 지우지 않습니다)</summary>
        ${renderCandidateTable()}
      </details>

      <div id="detail"></div>
    </div>
  `;

  const select = app.querySelector<HTMLSelectElement>("#topic-select")!;
  select.addEventListener("change", () => {
    selectedIndex = Number(select.value);
    render();
  });

  const modal = app.querySelector<HTMLDialogElement>("#week9-modal")!;
  app.querySelector<HTMLButtonElement>("#week9-btn")!.addEventListener("click", () => modal.showModal());
  app.querySelector<HTMLButtonElement>("#week9-close")!.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close(); // 배경 클릭으로도 닫힘
  });

  if (selectedIndex === -1) return;

  const topic = topics[selectedIndex];
  const evidence = data.evidence[topic.키];
  const detail = app.querySelector<HTMLDivElement>("#detail")!;

  const secs = build(topic, evidence, human);
  const issues = selfCheck(secs);

  detail.innerHTML = `
    <hr/>
    <h2>근거 요약</h2>
    ${topic.기각사유 ? `<div class="warn">이 주제는 후보 단계에서 기각되었습니다: ${topic.기각사유} — 그래도 문서를 만들어 볼 수는 있습니다.</div>` : ""}
    <p>${topic.한줄}</p>

    <hr/>
    <h2>사람이 쓰는 절 (자동으로 지어내지 않습니다)</h2>
    <div class="human-grid">
      <div>
        <label for="risk">이 판단이 틀릴 수 있는 지점 / 철회 기준</label>
        <textarea id="risk" rows="5" placeholder="예: OO 지표가 △△ 밑으로 떨어지면 즉시 철회한다">${human.위험}</textarea>
      </div>
      <div>
        <label for="ask">무엇을 결정해 주셔야 합니까</label>
        <textarea id="ask" rows="5" placeholder="예: 위 개선안 도입을 승인해 주십시오.">${human.요청}</textarea>
      </div>
    </div>

    <hr/>
    <h2>절별 미리보기</h2>
    <div id="sections">${secs.map((s) => sectionCard(s, evidence)).join("")}</div>

    <hr/>
    <h2>자가 검사</h2>
    <div id="selfcheck">${
      issues.length
        ? issues.map((i) => `<div class="warn">${i}</div>`).join("")
        : `<div class="ok">빈칸 0 · 절 개수 7 이하 · 요청 절에 결정 동사 있음 — 모두 통과</div>`
    }</div>

    <hr/>
    <button id="download">📄 HTML로 내려받기 (인쇄하면 A4)</button>
  `;

  const riskEl = detail.querySelector<HTMLTextAreaElement>("#risk")!;
  const askEl = detail.querySelector<HTMLTextAreaElement>("#ask")!;
  const rerenderDetail = () => {
    human.위험 = riskEl.value;
    human.요청 = askEl.value;
    const newSecs = build(topic, evidence, human);
    const newIssues = selfCheck(newSecs);
    detail.querySelector("#sections")!.innerHTML = newSecs.map((s) => sectionCard(s, evidence)).join("");
    detail.querySelector("#selfcheck")!.innerHTML = newIssues.length
      ? newIssues.map((i) => `<div class="warn">${i}</div>`).join("")
      : `<div class="ok">빈칸 0 · 절 개수 7 이하 · 요청 절에 결정 동사 있음 — 모두 통과</div>`;
  };
  riskEl.addEventListener("input", rerenderDetail);
  askEl.addEventListener("input", rerenderDetail);

  detail.querySelector("#download")!.addEventListener("click", () => {
    const currentSecs = build(topic, evidence, human);
    const svgs = chartsFor(currentSecs, evidence);
    const html = toHtml(currentSecs, `제안서 — ${topic.제목}`, svgs);
    downloadHtml(html, "제안서.html");
  });
}

render();
