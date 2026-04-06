let testSessionVerses = [];
let testCurrentStep   = 0;
let testTotalPenalty  = 0;
let testMaxSteps      = 10;
let isCurrentChecked  = false;

// ─── [1] 테스트 시작 ────────────────────────────────────────────────────
window.startTestSession = () => {
    if (!window.allVerses || window.allVerses.length === 0) {
        alert('데이터가 로드되지 않았습니다.');
        return;
    }
    const countInput = document.getElementById('test-count-input');
    const requested  = parseInt(countInput?.value) || 10;
    testMaxSteps = Math.min(requested, window.allVerses.length);

    testSessionVerses = [...window.allVerses]
        .sort(() => Math.random() - 0.5)
        .slice(0, testMaxSteps);

    testCurrentStep  = 0;
    testTotalPenalty = 0;
    isCurrentChecked = false;
    window.verses       = testSessionVerses;
    window.currentIndex = 0;

    document.getElementById('test-setup').style.display     = 'none';
    document.getElementById('test-section').style.display   = 'block';
    document.getElementById('status-panel').style.display   = 'flex';
    document.getElementById('test-controls').style.display  = 'block';
    document.getElementById('practice-controls').style.display = 'none';

    updateStatus();
    window.updateCardUI(window.verses[0]);
};

// ─── [2] 상태 업데이트 ──────────────────────────────────────────────────
function updateStatus() {
    const prog  = document.getElementById('test-progress');
    const score = document.getElementById('test-total-score');
    if (prog)  prog.innerText  = `진행: ${testCurrentStep + 1} / ${testMaxSteps}`;
    if (score) score.innerText = `누적 감점: ${testTotalPenalty}`;
}

// ─── [유틸] 음절 변환: 구두점 + 공백 제거 ──────────────────────────────
function toSyllable(text) {
    return text.replace(/[.,·?!"'()\[\]]/g, '').replace(/\s+/g, '');
}

// ─── [유틸] LCS 매칭 ────────────────────────────────────────────────────
function lcsMatch(origWords, inputWords) {
    const n    = origWords.length;
    const m    = inputWords.length;
    const oSyl = origWords.map(toSyllable);
    const iSyl = inputWords.map(toSyllable);

    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++)
        for (let j = 1; j <= m; j++)
            dp[i][j] = oSyl[i-1] === iSyl[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);

    const oM = new Array(n).fill(-1);
    const iM = new Array(m).fill(-1);
    let i = n, j = m;
    while (i > 0 && j > 0) {
        if (oSyl[i-1] === iSyl[j-1]) { oM[i-1] = j-1; iM[j-1] = i-1; i--; j--; }
        else if (dp[i-1][j] >= dp[i][j-1]) i--;
        else j--;
    }
    return { oM, iM, oSyl, iSyl, n, m };
}

// ─── [유틸] 정답[i] 기준 입력 범위 계산 ─────────────────────────────────
function getInputRange(origIdx, oM, n, m) {
    let lo = -1;
    for (let k = origIdx - 1; k >= 0; k--) { if (oM[k] !== -1) { lo = oM[k]; break; } }
    let hi = m;
    for (let k = origIdx + 1; k < n; k++) { if (oM[k] !== -1) { hi = oM[k]; break; } }
    return { lo, hi };
}

// ─── [유틸] 슬롯 빌더: 원문 순서 기준으로 각 단어의 채점 결과를 생성 ───
// slot 타입:
//   correct  : 정답 (초록)
//   wrong    : 오기입 — 입력값 취소선 + 정답 표기 (빨강)
//   missing  : 누락 — ___ + 정답 표기 (빨강)
//   extra    : 추가 — 입력값 취소선 + '추가' 표기 (보라)
//   spacing  : 띄어쓰기 오류 전체 (주황)
function buildSlots(origWords, inputWords, oM, iM, n, m) {
    const usedInput = new Set();
    const slots     = [];

    for (let i = 0; i < n; i++) {
        const { lo, hi } = getInputRange(i, oM, n, m);

        if (oM[i] !== -1) {
            // 이 정답 단어 앞, 앞 매칭 이후에 있는 추가 입력 단어들 먼저
            for (let j = lo + 1; j < oM[i]; j++) {
                if (iM[j] === -1 && !usedInput.has(j)) {
                    slots.push({ type: 'extra', word: inputWords[j] });
                    usedInput.add(j);
                }
            }
            usedInput.add(oM[i]);
            slots.push({ type: 'correct', word: origWords[i] });

        } else {
            // 미매칭 정답: (lo, hi) 범위 안 미매칭 입력들 수집
            const candidates = [];
            for (let j = lo + 1; j < hi; j++) {
                if (iM[j] === -1 && !usedInput.has(j)) candidates.push(j);
            }

            if (candidates.length === 0) {
                // 범위 안에 입력이 없음 = 순수 누락
                slots.push({ type: 'missing', correctWord: origWords[i] });
            } else {
                // 첫 번째 = 오기입, 나머지 = 추가
                slots.push({ type: 'wrong', inputWord: inputWords[candidates[0]], correctWord: origWords[i] });
                usedInput.add(candidates[0]);
                for (let k = 1; k < candidates.length; k++) {
                    slots.push({ type: 'extra', word: inputWords[candidates[k]] });
                    usedInput.add(candidates[k]);
                }
            }
        }
    }

    // 마지막 정답 이후 남은 추가 입력
    for (let j = 0; j < m; j++) {
        if (iM[j] === -1 && !usedInput.has(j)) {
            slots.push({ type: 'extra', word: inputWords[j] });
        }
    }
    return slots;
}

// ─── [유틸] 슬롯 → HTML 렌더링 ──────────────────────────────────────────
function renderSlots(slots) {
    return slots.map(s => {
        switch (s.type) {
            case 'correct':
                return `<span style="color:#16a34a;">${s.word}</span>`;

            case 'wrong':
                // 입력값 취소선 + 화살표 + 정답
                return `<span style="color:#ef4444;">` +
                    `<s style="color:#ef4444; opacity:0.7;">${s.inputWord}</s>` +
                    `<sup style="font-size:10px; margin:0 1px;">→</sup>` +
                    `<b>${s.correctWord}</b>` +
                    `</span>`;

            case 'missing':
                // 빈 자리 + 정답
                return `<span style="color:#ef4444;">` +
                    `<span style="border-bottom:2px solid #ef4444; padding:0 4px;">___</span>` +
                    `<sup style="font-size:10px; margin:0 1px;">→</sup>` +
                    `<b>${s.correctWord}</b>` +
                    `</span>`;

            case 'extra':
                // 입력값 취소선 + '추가'
                return `<span style="color:#7c3aed;">` +
                    `<s style="opacity:0.7;">${s.word}</s>` +
                    `<sup style="font-size:10px; margin:0 1px;">[추가]</sup>` +
                    `</span>`;

            case 'spacing':
                return `<span style="color:#d97706;">${s.word}<sup style="font-size:9px;">띄어쓰기</sup></span>`;

            default:
                return '';
        }
    }).join(' ');
}

// ─── [3] 채점 ───────────────────────────────────────────────────────────
window.runCheck = () => {
    if (isCurrentChecked) return;
    const v = window.verses[window.currentIndex];
    if (!v) return;

    const themeInput   = document.getElementById('test-theme-input').value.trim();
    const contentInput = document.getElementById('test-content-input').value.trim();

    const origWords  = v.content.split(/\s+/);
    const inputWords = contentInput.split(/\s+/).filter(w => w.length > 0);

    let penalty = 0;
    let details = [];

    // ── 제목 채점 ──────────────────────────────────────────────────────
    const themeOk = toSyllable(themeInput) === toSyllable(v.theme);
    if (!themeOk) { penalty += 1; details.push('제목 오류 (-1점)'); }

    // ── 본문 채점 ─────────────────────────────────────────────────────
    let contentPenalty = 0;
    let resultHTML     = '';

    if (inputWords.length === 0) {
        contentPenalty = 5;
        resultHTML = origWords.map(w =>
            `<span style="color:#ef4444;"><span style="border-bottom:2px solid #ef4444; padding:0 4px;">___</span>` +
            `<sup style="font-size:10px; margin:0 1px;">→</sup><b>${w}</b></span>`
        ).join(' ');
        details.push('본문 미입력 (-5점 상한)');

    } else {
        const { oM, iM, oSyl, iSyl, n, m } = lcsMatch(origWords, inputWords);

        // 전체 음절 동일 여부 (띄어쓰기만 다른 경우)
        const isSpacingOnly = oSyl.join('') === iSyl.join('');

        if (isSpacingOnly) {
            contentPenalty += 1;
            details.push('띄어쓰기 오류 (-1점, 내용은 정확)');
            resultHTML = origWords.map((w, i) =>
                oM[i] !== -1
                    ? `<span style="color:#16a34a;">${w}</span>`
                    : `<span style="color:#d97706;">${w}<sup style="font-size:9px;">띄어쓰기</sup></span>`
            ).join(' ');

        } else {
            const slots = buildSlots(origWords, inputWords, oM, iM, n, m);
            resultHTML  = renderSlots(slots);

            // 감점 계산
            slots.forEach(s => {
                if (s.type === 'wrong')   { contentPenalty += 1; details.push(`'${s.correctWord}' 자리에 오기입 (-1점)`); }
                if (s.type === 'missing') { contentPenalty += 1; details.push(`'${s.correctWord}' 누락 (-1점)`); }
                if (s.type === 'extra')   { contentPenalty += 1; details.push(`'${s.word}' 불필요한 단어 (-1점)`); }
            });
        }
    }

    // ── 최종 감점 ────────────────────────────────────────────────────
    const totalRaw = penalty + contentPenalty;
    const capped   = Math.min(totalRaw, 5);
    testTotalPenalty += capped;
    isCurrentChecked  = true;

    // ── 감점 상세 ────────────────────────────────────────────────────
    const detailsHTML = details.length > 0
        ? `<div style="font-size:11px; color:#555; margin-top:8px; line-height:1.9;
                       padding:8px 10px; background:rgba(0,0,0,0.04); border-radius:8px;">
            <b style="font-size:11px;">감점 상세</b><br>
            ${details.map(d => `• ${d}`).join('<br>')}
            ${totalRaw > 5
                ? `<br><span style="color:#aaa;">• 초과 ${totalRaw - 5}점은 상한(5점)으로 면제</span>`
                : ''}
           </div>`
        : '';

    // ── 결과 카드 ────────────────────────────────────────────────────
    const isPerfect  = capped === 0;
    const bgColor    = isPerfect ? '#f0fdf4' : '#fef2f2';
    const bdColor    = isPerfect ? '#bbf7d0' : '#fee2e2';
    const scoreColor = isPerfect ? '#16a34a' : '#ef4444';
    const scoreMsg   = isPerfect ? '완벽합니다!' : `이번 감점: -${capped}점`;

    document.getElementById('test-result-view').innerHTML = `
        <div style="background:${bgColor}; padding:15px; border-radius:15px;
                    border:1px solid ${bdColor}; margin-top:15px; text-align:left; font-size:14px;">

            <b style="color:${scoreColor}; font-size:16px;">${scoreMsg}</b>

            <div style="margin-top:12px;">
                <span style="font-size:12px; color:#888;">제목</span><br>
                <span style="color:${themeOk ? '#16a34a' : '#ef4444'}; font-weight:bold;">
                    ${themeInput || '(미입력)'}
                </span>
                ${!themeOk
                    ? `<sup style="font-size:10px; color:#ef4444; margin-left:4px;">✗ 정답: ${v.theme}</sup>`
                    : `<sup style="font-size:10px; color:#16a34a; margin-left:4px;">✓</sup>`}
            </div>

            <div style="margin-top:12px;">
                <span style="font-size:12px; color:#888;">본문 분석</span>
                <div style="font-size:11px; color:#aaa; margin-top:2px;">
                    <span style="color:#16a34a;">●</span> 정답 &nbsp;
                    <span style="color:#ef4444;">●</span> 오기입(<s>입력</s>→정답) / 누락(___→정답) &nbsp;
                    <span style="color:#7c3aed;">●</span> 추가(<s>입력</s>[추가])
                </div>
                <div style="margin-top:8px; line-height:2.4; word-break:keep-all; font-size:15px;">
                    ${resultHTML}
                </div>
            </div>

            ${detailsHTML}

            <div style="margin-top:12px; font-size:11px; color:#999;
                        border-top:1px solid ${bdColor}; padding-top:10px; line-height:1.7;">
                <b>정답 전체</b><br>${v.content}
            </div>
        </div>
    `;
    document.getElementById('test-result-view').style.display = 'block';
    updateStatus();
};

// ─── [4] 다음 문제 ───────────────────────────────────────────────────────
window.testNext = () => {
    if (!isCurrentChecked) {
        if (!confirm('채점하지 않고 다음 구절로 넘어가시겠습니까?')) return;
    }
    if (testCurrentStep < testMaxSteps - 1) {
        testCurrentStep++;
        window.currentIndex = testCurrentStep;
        isCurrentChecked    = false;
        document.getElementById('test-theme-input').value         = '';
        document.getElementById('test-content-input').value       = '';
        document.getElementById('test-result-view').style.display = 'none';
        window.updateCardUI(window.verses[window.currentIndex]);
        updateStatus();
    } else {
        const avg = (testTotalPenalty / testMaxSteps).toFixed(1);
        alert(`테스트 완료!\n총 ${testMaxSteps}구절\n누적 감점: ${testTotalPenalty}점\n평균 감점: ${avg}점/구절\n\n연습 모드로 돌아갑니다.`);
        window.setMode('practice');
    }
};
