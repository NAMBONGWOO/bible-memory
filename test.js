let testSessionVerses = [];
let testCurrentStep = 0;
let testTotalPenalty = 0;
let testMaxSteps = 10;
let isCurrentChecked = false;

// ─── [1] 테스트 시작 ────────────────────────────────────────────────────
window.startTestSession = () => {
    if (!window.allVerses || window.allVerses.length === 0) {
        alert('데이터가 로드되지 않았습니다.');
        return;
    }
    const countInput = document.getElementById('test-count-input');
    const requested = parseInt(countInput?.value) || 10;
    testMaxSteps = Math.min(requested, window.allVerses.length);

    testSessionVerses = [...window.allVerses]
        .sort(() => Math.random() - 0.5)
        .slice(0, testMaxSteps);

    testCurrentStep  = 0;
    testTotalPenalty = 0;
    isCurrentChecked = false;
    window.verses       = testSessionVerses;
    window.currentIndex = 0;

    document.getElementById('test-setup').style.display    = 'none';
    document.getElementById('test-section').style.display  = 'block';
    document.getElementById('status-panel').style.display  = 'flex';
    document.getElementById('test-controls').style.display = 'block';
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

// ─── [유틸] 구두점 제거 (공백은 유지 — 단어 분리에 필요) ─────────────────
function removePunct(text) {
    return text.replace(/[.,·?!"'()\[\]]/g, '');
}

// ─── [유틸] 음절 비교용: 구두점 + 공백 모두 제거 ───────────────────────
// 띄어쓰기가 달라도 같은 내용이면 동일하게 처리하기 위한 핵심
function toSyllable(text) {
    return removePunct(text).replace(/\s+/g, '');
}

// ─── [유틸] LCS — 음절 기준으로 단어 매칭 ──────────────────────────────
// origWords, inputWords 각 단어를 toSyllable로 변환 후 비교
// → 띄어쓰기 차이를 무시하고 내용만 비교
function lcsMatch(origWords, inputWords) {
    const n = origWords.length;
    const m = inputWords.length;
    const oSyl = origWords.map(toSyllable);
    const iSyl = inputWords.map(toSyllable);

    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            dp[i][j] = oSyl[i-1] === iSyl[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);
        }
    }

    const origMatched  = new Array(n).fill(-1);
    const inputMatched = new Array(m).fill(-1);
    let i = n, j = m;
    while (i > 0 && j > 0) {
        if (oSyl[i-1] === iSyl[j-1]) {
            origMatched[i-1]  = j-1;
            inputMatched[j-1] = i-1;
            i--; j--;
        } else if (dp[i-1][j] >= dp[i][j-1]) {
            i--;
        } else {
            j--;
        }
    }
    return { origMatched, inputMatched, oSyl, iSyl };
}

// ─── [유틸] 순서 뒤바뀜 감지 ─────────────────────────────────────────────
function detectSwapped(oSyl, iSyl, origMatched, inputMatched) {
    const swappedOrig  = new Set();
    const swappedInput = new Set();
    for (let i = 0; i < oSyl.length; i++) {
        if (origMatched[i] !== -1) continue;
        for (let j = 0; j < iSyl.length; j++) {
            if (inputMatched[j] !== -1) continue;
            if (oSyl[i] === iSyl[j]) {
                swappedOrig.add(i);
                swappedInput.add(j);
                break;
            }
        }
    }
    return { swappedOrig, swappedInput };
}

// ─── [유틸] 띄어쓰기 오류 감지 ───────────────────────────────────────────
// 단어 단위 매칭은 실패했지만, 음절 전체를 이어붙이면 동일한 경우
// → "정하신것이요" vs "정하신 것이요" 같은 케이스
function checkSpacingError(origWords, inputWords, origMatched, inputMatched) {
    // 정답 전체 음절열과 입력 전체 음절열을 비교
    const origFull  = origWords.map(toSyllable).join('');
    const inputFull = inputWords.map(toSyllable).join('');
    return origFull === inputFull; // 음절이 완전히 같으면 띄어쓰기만 다른 것
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
    if (!themeOk) {
        penalty += 1;
        details.push('제목 오류 (-1점)');
    }

    // ── 본문 채점 ─────────────────────────────────────────────────────
    let contentPenalty = 0;
    let resultHTML     = '';

    if (inputWords.length === 0) {
        contentPenalty = 5;
        resultHTML = origWords.map(w =>
            `<span style="color:#ef4444;">${w}<sup style="font-size:9px;">누락</sup></span> `
        ).join('');
        details.push('본문 미입력 (-5점 상한)');

    } else {
        // 먼저 전체 띄어쓰기 오류 여부 확인
        const isSpacingOnlyError = checkSpacingError(origWords, inputWords, [], []);

        const { origMatched, inputMatched, oSyl, iSyl } = lcsMatch(origWords, inputWords);
        const { swappedOrig, swappedInput } = detectSwapped(oSyl, iSyl, origMatched, inputMatched);

        let swapPenaltyApplied = false;

        // 정답 단어 기준 렌더링
        for (let i = 0; i < origWords.length; i++) {
            const word = origWords[i];

            if (origMatched[i] !== -1) {
                // ✅ 정상 매칭
                resultHTML += `<span style="color:#16a34a;">${word}</span> `;

            } else if (swappedOrig.has(i)) {
                // 🔄 순서 뒤바뀜 — 쌍 전체에 1점만
                if (!swapPenaltyApplied) {
                    contentPenalty += 1;
                    details.push('어절 순서 뒤바뀜 (-1점, ↕ 표시)');
                    swapPenaltyApplied = true;
                }
                resultHTML += `<span style="color:#d97706;">${word}<sup style="font-size:9px;">↕순서</sup></span> `;

            } else {
                // ❌ 누락/오기입 — 단, 입력에서 음절이 인접 단어와 붙여쓴 경우 띄어쓰기 오류로 처리
                // 인접 입력 단어들을 합쳤을 때 정답 단어 음절과 일치하는지 확인
                let spacingFix = false;
                const target = oSyl[i];
                for (let j = 0; j < inputWords.length; j++) {
                    if (inputMatched[j] !== -1) continue;
                    // 인접 미매칭 단어 1~2개를 합쳐서 확인
                    if (iSyl[j] === target) {
                        spacingFix = true; break;
                    }
                    if (j+1 < inputWords.length && inputMatched[j+1] === -1) {
                        if (iSyl[j] + iSyl[j+1] === target || target === iSyl[j].slice(0, target.length)) {
                            spacingFix = true; break;
                        }
                    }
                }

                if (isSpacingOnlyError) {
                    // 전체가 띄어쓰기만 다른 경우: 해당 단어를 주황으로 표시, 별도 감점 없음
                    resultHTML += `<span style="color:#d97706;">${word}<sup style="font-size:9px;">띄어쓰기</sup></span> `;
                } else {
                    contentPenalty += 1;
                    details.push(`'${word}' 누락/오기입 (-1점)`);
                    resultHTML += `<span style="color:#ef4444; text-decoration:underline;">___<sup style="font-size:9px;">누락</sup></span> `;
                }
            }
        }

        // 입력했지만 정답에 없는 단어 (순서 뒤바뀜 쌍 제외)
        for (let j = 0; j < inputWords.length; j++) {
            if (inputMatched[j] === -1 && !swappedInput.has(j)) {
                if (!isSpacingOnlyError) {
                    contentPenalty += 1;
                    details.push(`'${inputWords[j]}' 정답에 없는 단어 (-1점)`);
                    resultHTML += `<span style="color:#7c3aed; text-decoration:line-through;">${inputWords[j]}<sup style="font-size:9px;">추가</sup></span> `;
                }
            }
        }

        // 전체가 띄어쓰기 오류만인 경우: 1점 감점
        if (isSpacingOnlyError) {
            contentPenalty += 1;
            details.push('띄어쓰기 오류 (-1점, 내용은 정확)');
        }
    }

    // ── 최종 감점 ────────────────────────────────────────────────────
    const totalRaw = penalty + contentPenalty;
    const capped   = Math.min(totalRaw, 5);
    testTotalPenalty += capped;
    isCurrentChecked = true;

    // ── 감점 상세 ────────────────────────────────────────────────────
    const detailsHTML = details.length > 0
        ? `<div style="font-size:11px; color:#555; margin-top:8px; line-height:1.9; padding:8px 10px; background:rgba(0,0,0,0.03); border-radius:8px;">
            <b style="font-size:11px;">감점 상세</b><br>
            ${details.map(d => `• ${d}`).join('<br>')}
            ${totalRaw > 5 ? `<br><span style="color:#aaa;">• 초과 ${totalRaw - 5}점은 상한(5점)으로 면제</span>` : ''}
           </div>`
        : '';

    // ── 결과 카드 ────────────────────────────────────────────────────
    const isPerfect  = capped === 0;
    const bgColor    = isPerfect ? '#f0fdf4' : '#fef2f2';
    const bdColor    = isPerfect ? '#bbf7d0' : '#fee2e2';
    const scoreColor = isPerfect ? '#16a34a' : '#ef4444';
    const scoreMsg   = isPerfect ? '완벽합니다!' : `이번 감점: -${capped}점`;

    document.getElementById('test-result-view').innerHTML = `
        <div style="background:${bgColor}; padding:15px; border-radius:15px; border:1px solid ${bdColor}; margin-top:15px; text-align:left; font-size:14px;">

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
                <span style="font-size:12px; color:#888;">본문 분석</span><br>
                <div style="margin-top:6px; line-height:2.4; word-break:keep-all;">
                    ${resultHTML}
                </div>
            </div>

            <div style="margin-top:8px; font-size:11px; color:#888; display:flex; flex-wrap:wrap; gap:10px;">
                <span><span style="color:#16a34a;">●</span> 정답</span>
                <span><span style="color:#d97706;">●</span> 순서↕·띄어쓰기 (-1점)</span>
                <span><span style="color:#ef4444;">●</span> 누락 (-1점/개)</span>
                <span><span style="color:#7c3aed;">●</span> 불필요 (-1점/개)</span>
            </div>

            ${detailsHTML}

            <div style="margin-top:12px; font-size:11px; color:#999; border-top:1px solid ${bdColor}; padding-top:10px; line-height:1.7;">
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
