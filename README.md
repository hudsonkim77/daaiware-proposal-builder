# daaiware-proposal-builder

Da-AI-Ware 영업 퍼널 제안서 생성기 — `그룹웨어영업-report`(Streamlit) 대시보드의 `pages/5_제안서.py` 기능만
정적 웹앱으로 포팅한 것. 9주차 최종 결과물(Vercel 배포용).

## 왜 Streamlit이 아니라 여기로 옮겼는가

이 기능(제안 주제 선택 → 근거 확인 → 문서 조립 → HTML 내려받기)은 서버 계산이 필요 없다 — 모든 통계 계산(카이제곱
검정, 격차·규모 산출 등)은 Python(`core/metrics.py`)에서 이미 끝내 `src/data/proposal_data.json`으로 내보냈고,
이 웹앱은 그 결과를 읽어 화면만 그린다. 서버리스 함수도, 외부 API도 필요 없는 순수 정적 사이트라 Vercel의
제로 설정 배포(Framework Preset: Vite)로 충분하다.

## 데이터 원본과 동기화

이 프로젝트의 계산 로직은 전부 `../그룹웨어영업-report/`에서 **그대로 옮긴 것**이다. 로직을 바꿀 때는 항상
Python 쪽을 먼저 고치고, 그 다음 여기 대응 파일을 같이 고친다.

| Python 원본 | 이 프로젝트의 대응 파일 |
|---|---|
| `core/config.py` | `src/data/config.ts` |
| `report/proposal.py`의 `CARDS` | `src/data/cards.ts` |
| `report/proposal.py`의 `build`/`self_check`/`to_html`/`_ro` | `src/lib/proposal.ts` |
| `viz/proposal_charts.py` | `src/lib/charts.ts` |
| `core/metrics.py`(계산 자체) | 없음 — 결과만 JSON으로 받는다 |

데이터(퍼널·지표)가 바뀌면 `그룹웨어영업-report/`에서 다음을 실행해 JSON을 다시 만들고 복사한다.

```bash
cd ../그룹웨어영업-report
python export_for_vercel.py
cp export_proposal_data.json ../daaiware-proposal-builder/src/data/proposal_data.json
```

## 개발

```bash
npm install
npm run dev          # http://localhost:5173
```

## 검증

```bash
npm run verify         # build()/selfCheck()/toHtml()를 Node에서 직접 실행 — Python 출력과 문장 단위로 대조됨
npm run browser-check  # 실제 Chromium으로 빌드본을 띄워 선택·입력·차트 렌더링·다운로드까지 확인
```

## 배포 (Vercel)

이 프로젝트는 서버리스 함수도 환경변수도 필요 없는 순수 정적 사이트다.

1. GitHub에 이 저장소를 올린다.
2. [vercel.com](https://vercel.com)에서 GitHub 계정으로 로그인 → **Add New → Project** → 이 저장소 Import.
3. Framework Preset: **Vite** (자동 감지됨), Build Command `npm run build`, Output Directory `dist` — 전부 기본값 그대로 두면 된다.
4. Deploy. 환경변수 설정 단계 자체가 없다.
