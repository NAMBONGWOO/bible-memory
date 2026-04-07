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

// ─── [유틸] 구두점·공백 제거 → 순수 음절 문자열 ─────────────────────────
function toSyl(t) {
    return t.replace(/[.,·?!"'()\[\]]/g, '').replace(/\s+/g, '');
}

// ─── [유틸] 음절 단위 LCS ───────────────────────────────────────────────
// 띄어쓰기를 완전히 제거한 음절 문자열로 LCS → 띄어쓰기 무관 비교
function sylLCS(oSyl, iSyl) {
    const n = oSyl.length, m = iSyl.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++)
        for (let j = 1; j <= m; j++)
            dp[i][j] = oSyl[i-1] === iSyl[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);
    const oM = new Array(n).fill(-1), iM = new Array(m).fill(-1);
    let i = n, j = m;
    while (i > 0 && j > 0) {
        if (oSyl[i-1] === iSyl[j-1]) { oM[i-1]=j-1; iM[j-1]=i-1; i--; j--; }
        else if (dp[i-1][j] >= dp[i][j-1]) i--;
        else j--;
    }
    return { oM, iM };
}

// ─── [유틸] 어절별 음절 범위 계산 ───────────────────────────────────────
function getWordRanges(words) {
    const r = []; let p = 0;
    words.forEach(w => {
        const s = toSyl(w);
        if (s.length > 0) { r.push({ word: w, start: p, end: p + s.length - 1 }); p += s.length; }
    });
    return r;
}

// ─── [유틸] 채점 토큰 생성 ──────────────────────────────────────────────
// 토큰 타입:
//   correct : 정답 어절
//   wrong   : 오기입 (입력한 내용 → 정답)
//   missing : 누락
//   partial : 부분 오기입 (어절 일부만 틀림)
//   extra   : 끼워넣기 (정답에 없는 음절/단어)
function buildTokens(origWords, oSyl, iSyl, oM, iM) {
    const origRanges = getWordRanges(origWords);
    const usedJ = new Set();
    const tokens = [];

    // 어절 wi의 앞 경계(이전 어절 마지막 매칭 j)
    function prevLastJ(wi) {
        for (let k = wi - 1; k >= 0; k--) {
            const r = origRanges[k];
            for (let i = r.end; i >= r.start; i--) if (oM[i] !== -1) return oM[i];
        }
        return -1;
    }
    // 어절 wi의 뒤 경계(다음 어절 첫 매칭 j)
    function nextFirstJ(wi) {
        for (let k = wi + 1; k < origRanges.length; k++) {
            const r = origRanges[k];
            for (let i = r.start; i <= r.end; i++) if (oM[i] !== -1) return oM[i];
        }
        return iSyl.length;
    }

    origRanges.forEach(({ word, start, end }, wi) => {
        const sylLen   = end - start + 1;
        const matchedJ = [];
        for (let i = start; i <= end; i++) if (oM[i] !== -1) matchedJ.push(oM[i]);

        const pLJ      = prevLastJ(wi);
        const nFJ      = nextFirstJ(wi);
        const myFirstJ = matchedJ.length > 0 ? Math.min(...matchedJ) : nFJ;
        const myLastJ  = matchedJ.length > 0 ? Math.max(...matchedJ) : pLJ;

        // 이 어절 앞 끼워넣기 (이전 어절 마지막 ~ 이 어절 첫 매칭 사이)
        for (let j = pLJ + 1; j < myFirstJ; j++) {
            if (iM[j] === -1 && !usedJ.has(j)) {
                tokens.push({ type: 'extra', syls: iSyl[j] });
                usedJ.add(j);
            }
        }

        if (matchedJ.length === sylLen) {
            // ✅ 완전 정답
            matchedJ.forEach(j => usedJ.add(j));
            tokens.push({ type: 'correct', word });

        } else if (matchedJ.length === 0) {
            // 이 어절 범위 안의 미매칭 입력 확인
            const wrongSyls = [];
            for (let j = pLJ + 1; j < nFJ; j++) {
                if (iM[j] === -1 && !usedJ.has(j)) { wrongSyls.push(iSyl[j]); usedJ.add(j); }
            }
            if (wrongSyls.length > 0) {
                // ❌ 완전 오기입
                tokens.push({ type: 'wrong', word, inputStr: wrongSyls.join('') });
            } else {
                // ⬜ 누락
                tokens.push({ type: 'missing', word });
            }

        } else {
            // ⚠️ 부분 매칭: 어절 내 일부 음절만 다름
            // 입력에서 이 어절 범위에 해당하는 음절 추출
            const inputSlice = [];
            for (let j = pLJ + 1; j <= myLastJ; j++) {
                if ((iM[j] >= start && iM[j] <= end) ||
                    (iM[j] === -1 && !usedJ.has(j))) {
                    inputSlice.push(iSyl[j]);
                    if (iM[j] === -1) usedJ.add(j);
                }
            }
            matchedJ.forEach(j => usedJ.add(j));
            // 미매칭 정답 음절 (오기입된 자리)
            const missedSyls = [];
            for (let i = start; i <= end; i++) if (oM[i] === -1) missedSyls.push(oSyl[i]);
            tokens.push({ type: 'partial', word, inputSlice: inputSlice.join(''), missedSyls: missedSyls.join('') });
        }
    });

    // 마지막 어절 이후 끼워넣기
    const lastR = origRanges[origRanges.length - 1];
    let lastJ = -1;
    for (let i = lastR.start; i <= lastR.end; i++) if (oM[i] !== -1) lastJ = oM[i];
    for (let j = lastJ + 1; j < iSyl.length; j++) {
        if (iM[j] === -1 && !usedJ.has(j)) tokens.push({ type: 'extra', syls: iSyl[j] });
    }

    return tokens;
}

// ─── [유틸] 토큰 → HTML ─────────────────────────────────────────────────
function renderTokens(tokens) {
    // 연속 extra 합치기
    const merged = [];
    tokens.forEach(t => {
        if (t.type === 'extra' && merged.length > 0 && merged[merged.length-1].type === 'extra') {
            merged[merged.length-1].syls += t.syls;
        } else {
            merged.push({ ...t });
        }
    });

    return merged.map(t => {
        switch (t.type) {
            case 'correct':
                return `<span style="color:#16a34a;">${t.word}</span>`;

            case 'wrong':
                return `<span style="color:#ef4444;">` +
                    `<s style="opacity:0.65;">${t.inputStr}</s>` +
                    `<sup style="font-size:10px; margin:0 2px;">→</sup>` +
                    `<b>${t.word}</b></span>`;

            case 'missing':
                return `<span style="color:#ef4444;">` +
                    `<span style="border-bottom:2px solid #ef4444; padding:0 3px; letter-spacing:2px;">___</span>` +
                    `<sup style="font-size:10px; margin:0 2px;">→</sup>` +
                    `<b>${t.word}</b></span>`;

            case 'partial':
                // 부분 오기입: 입력 취소선 → 정답 + 오기입 음절 표시
                return `<span style="color:#ef4444;">` +
                    `<s style="opacity:0.65;">${t.inputSlice}</s>` +
                    `<sup style="font-size:10px; margin:0 2px;">→</sup>` +
                    `<b>${t.word}</b>` +
                    `<sup style="font-size:9px; color:#f59e0b; margin-left:2px;">[오기입:${t.missedSyls}]</sup>` +
                    `</span>`;

            case 'extra':
                return `<span style="color:#7c3aed;">` +
                    `<s style="opacity:0.65;">${t.syls}</s>` +
                    `<sup style="font-size:10px; margin:0 2px;">[추가]</sup></span>`;

            default: return '';
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

    // ── 제목 채점 (음절 기준, 띄어쓰기 무관) ─────────────────────────
    const themeOk = toSyl(themeInput) === toSyl(v.theme);
    if (!themeOk) { penalty += 1; details.push('제목 오류 (-1점)'); }

    // ── 본문 채점 ─────────────────────────────────────────────────────
    let contentPenalty = 0;
    let resultHTML     = '';

    if (inputWords.length === 0) {
        contentPenalty = 5;
        resultHTML = origWords.map(w =>
            `<span style="color:#ef4444;">` +
            `<span style="border-bottom:2px solid #ef4444; padding:0 3px; letter-spacing:2px;">___</span>` +
            `<sup style="font-size:10px; margin:0 2px;">→</sup><b>${w}</b></span>`
        ).join(' ');
        details.push('본문 미입력 (-5점 상한)');

    } else {
        const oSyl = toSyl(v.content).split('');
        const iSyl = toSyl(contentInput).split('');
        const { oM, iM } = sylLCS(oSyl, iSyl);
        const tokens = buildTokens(origWords, oSyl, iSyl, oM, iM);
        resultHTML   = renderTokens(tokens);

        // 감점 집계
        tokens.forEach(t => {
            if (t.type === 'wrong') {
                contentPenalty += 1;
                details.push(`'${t.word}' 오기입 (-1점)`);
            }
            if (t.type === 'missing') {
                contentPenalty += 1;
                details.push(`'${t.word}' 누락 (-1점)`);
            }
            if (t.type === 'partial') {
                contentPenalty += 1;
                details.push(`'${t.word}' 부분 오기입[${t.missedSyls}] (-1점)`);
            }
            if (t.type === 'extra') {
                contentPenalty += 1;
                details.push(`'${t.syls}' 끼워넣기 (-1점)`);
            }
        });
    }

    // ── 최종 감점 (문제당 최대 5점) ─────────────────────────────────
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
                <div style="font-size:11px; color:#aaa; margin-top:2px; display:flex; flex-wrap:wrap; gap:8px;">
                    <span><span style="color:#16a34a;">●</span> 정답</span>
                    <span><span style="color:#ef4444;">●</span> 오기입(<s>입력</s>→정답) / 누락(___→정답)</span>
                    <span><span style="color:#7c3aed;">●</span> 끼워넣기(<s>추가음절</s>[추가])</span>
                    <span style="color:#bbb;">※ 띄어쓰기 무관</span>
                </div>
                <div style="margin-top:8px; line-height:2.6; word-break:keep-all; font-size:15px;">
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
