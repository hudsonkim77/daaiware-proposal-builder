// core/config.py 를 그대로 옮긴 것 — 값을 바꾸면 두 파일 다 바꾼다.

export const COLORS = {
  accent: "#2a78d6",
  base: "#b7d3f6",
  gray: "#cbd5e1",
  danger: "#eb6834",
};

export const PROPOSAL_WORDS = {
  섹션_현황: "지금 어디서 새고 있습니까",
  섹션_원인: "어느 세그먼트·채널에서 벌어집니까",
  섹션_규모: "얼마짜리 문제입니까",
  섹션_제안: "무엇을 하자는 것입니까",
  섹션_위험: "이 판단이 틀릴 수 있는 지점",
  섹션_요청: "무엇을 결정해 주셔야 합니까",
  판정_승인: "승인해 주십시오",
  판정_조건부: "조건부로 승인해 주십시오(범위를 축소해 시작)",
  판정_보류: "보류하고 다음 분기 데이터로 재검토해 주십시오",
};

export interface ThresholdDef {
  label: string;
  from_step?: string;
  to_step?: string;
  segment?: string;
  warn: number;
  danger: number;
}

export const THRESHOLDS: Record<string, ThresholdDef> = {
  demo_request_rate: {
    label: "데모신청 전환율(Primary)",
    segment: "Primary",
    from_step: "제품페이지조회",
    to_step: "데모신청",
    warn: 30.0,
    danger: 25.0,
  },
  contract_close_rate: {
    label: "계약체결 전환율(Secondary)",
    segment: "Secondary",
    from_step: "데모신청",
    to_step: "계약체결",
    warn: 12.0,
    danger: 8.0,
  },
  low_usage_renewal_rate: {
    label: "저활용 계정 재계약율(활용률<40%)",
    warn: 15.0,
    danger: 10.0,
  },
};
