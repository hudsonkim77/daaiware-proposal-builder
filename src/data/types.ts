// core/metrics.py 가 만드는 JSON 구조에 대응하는 타입.

export interface Topic {
  키: string;
  제목: string;
  한줄: string;
  규모_연간건수: number;
  근거축: string | null;
  구간: string | null;
  기각사유: string | null;
}

export interface FunnelRow {
  단계: string;
  도달: number;
  전단계대비: number;
}

export interface GapRow {
  칸: string;
  도달: number;
  전환: number;
  전환율: number;
  비중: number;
  최고: boolean;
  최저: boolean;
}

export interface MonthlyPoint {
  월: string;
  전환율: number | null;
  분모: number;
}

export interface TrendInfo {
  키: string;
  제목: string;
  한줄: string;
  규모_연간건수: number;
  근거축: string | null;
  구간: string | null;
  기각사유: string | null;
  월별?: MonthlyPoint[];
  사유?: string;
}

export interface Evidence {
  현황: { 퍼널: FunnelRow[] | null; 사유: string | null };
  원인: { 축: string | null; 표: GapRow[] | null; 사유?: string };
  규모: { 연간건수: number; 가정: string[] };
  추세: TrendInfo | { 사유: string };
}

export interface ProposalData {
  topics: Topic[];
  evidence: Record<string, Evidence>;
}
