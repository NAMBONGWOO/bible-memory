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

// ─── [유틸] 구두점·공백 제거 → 음절 문자열 ──────────────────────────────
function toSyl(text) {
    return text.replace(/[.,·?!"'()\[\]]/g, '').replace(/\s+/g, '');
}

// ─── [유틸] 음절 단위 LCS 매칭 ──────────────────────────────────────────
// 띄어쓰기를 완전히 무시하고 음절 내용만으로 비교
function sylLCS(origSyl, inputSyl) {
    const n = origSyl.length, m = inputSyl.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++)
        for (let j = 1; j <= m; j++)
            dp[i][j] = origSyl[i-1] === inputSyl[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);

    const oM = new Array(n).fill(-1);
    const iM = new Array(m).fill(-1);
    let i = n, j = m;
    while (i > 0 && j > 0) {
        if (origSyl[i-1] === inputSyl[j-1]) { oM[i-1] = j-1; iM[j-1] = i-1; i--; j--; }
        else if (dp[i-1][j] >= dp[i][j-1]) i--;
        else j--;
    }
    return { oM, iM };
}

// ─── [유틸] 어절별 음절 범위 계산 ───────────────────────────────────────
function getWordRanges(words) {
    const ranges = [];
    let pos = 0;
    words.forEach(w => {
        const s = toSyl(w);
        if (s.length > 0) {
            ranges.push({ word: w, start: pos, end: pos + s.length - 1 });
            pos += s.length;
        }
    });
    return ranges;
}

// ─── [유틸] 어절별 채점 결과 생성 ───────────────────────────────────────
// 채점 기준:
//   correct : 어절의 모든 음절이 순서대로 매칭됨
//   missing : 어절의 음절이 하나도 매칭 안됨 (누락)
//   wrong   : 일부만 매칭 (오기입) → 입력한 내용 표시
//   extra   : 정답에 없는 추가 입력 어절
// ※ 띄어쓰기는 음절 변환 시 완전히 제거되므로 채점에 영향 없음
function gradeWords(origWords, inputWords, oM, iM, inputSyl) {
    const origRanges  = getWordRanges(origWords);
    const inputRanges = getWordRanges(inputWords);
    const result      = [];

    origRanges.forEach(({ word, start, end }) => {
        const sylLen    = end - start + 1;
        const matchedJ  = [];
        for (let i = start; i <= end; i++) {
            if (oM[i] !== -1) matchedJ.push(oM[i]);
        }

        if (matchedJ.length === sylLen) {
            // ✅ 전체 음절 매칭 → 정답
            result.push({ type: 'correct', word });

        } else if (matchedJ.length === 0) {
            // ⬜ 하나도 매칭 안됨 → 누락
            result.push({ type: 'missing', word });

        } else {
            // ❌ 일부 매칭 → 오기입: 입력에서 해당 범위 어절 복원
            const minJ = Math.min(...matchedJ);
            const maxJ = Math.max(...matchedJ);
            const coveredWords = inputRanges
                .filter(r => r.start <= maxJ && r.end >= minJ)
                .map(r => r.word);
            result.push({ type: 'wrong', word, inputStr: coveredWords.join(' ') || '?' });
        }
    });

    // ➕ 정답에 매칭되지 않은 입력 어절 → 추가
    const extraWords = inputRanges.filter(r => {
        for (let j = r.start; j <= r.end; j++) {
            if (iM[j] !== -1) return false;
        }
        return true;
    }).map(r => r.word);

    if (extraWords.length > 0) {
        result.push({ type: 'extra', words: extraWords });
    }

    return result;
}

// ─── [유틸] 채점 결과 → HTML ────────────────────────────────────────────
function renderGrades(grades) {
    return grades.map(g => {
        switch (g.type) {
            case 'correct':
                return `<span style="color:#16a34a;">${g.word}</span>`;

            case 'wrong':
                return `<span style="color:#ef4444;">` +
                    `<s style="opacity:0.65;">${g.inputStr}</s>` +
                    `<sup style="font-size:10px; margin:0 2px;">→</sup>` +
                    `<b>${g.word}</b></span>`;

            case 'missing':
                return `<span style="color:#ef4444;">` +
                    `<span style="border-bottom:2px solid #ef4444; padding:0 3px; letter-spacing:2px;">___</span>` +
                    `<sup style="font-size:10px; margin:0 2px;">→</sup>` +
                    `<b>${g.word}</b></span>`;

            case 'extra':
                return g.words.map(w =>
                    `<span style="color:#7c3aed;">` +
                    `<s style="opacity:0.65;">${w}</s>` +
                    `<sup style="font-size:10px; margin:0 2px;">[추가]</sup></span>`
                ).join(' ');

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

    // ── 제목 채점: 음절 기준 비교 ─────────────────────────────────────
    const themeOk = toSyl(themeInput) === toSyl(v.theme);
    if (!themeOk) { penalty += 1; details.push('제목 오류 (-1점)'); }

    // ── 본문 채점 ─────────────────────────────────────────────────────
    let contentPenalty = 0;
    let resultHTML     = '';

    if (inputWords.length === 0) {
        // 미입력
        contentPenalty = 5;
        resultHTML = origWords.map(w =>
            `<span style="color:#ef4444;">` +
            `<span style="border-bottom:2px solid #ef4444; padding:0 3px; letter-spacing:2px;">___</span>` +
            `<sup style="font-size:10px; margin:0 2px;">→</sup><b>${w}</b></span>`
        ).join(' ');
        details.push('본문 미입력 (-5점 상한)');

    } else {
        // 음절 단위 LCS (띄어쓰기 완전 무시)
        const origSyl  = toSyl(v.content).split('');
        const inputSyl = toSyl(contentInput).split('');
        const { oM, iM } = sylLCS(origSyl, inputSyl);

        const grades = gradeWords(origWords, inputWords, oM, iM, inputSyl);
        resultHTML   = renderGrades(grades);

        // 감점 계산
        grades.forEach(g => {
            if (g.type === 'wrong') {
                contentPenalty += 1;
                details.push(`'${g.word}' 자리 오기입 (-1점)`);
            }
            if (g.type === 'missing') {
                contentPenalty += 1;
                details.push(`'${g.word}' 누락 (-1점)`);
            }
            if (g.type === 'extra') {
                g.words.forEach(w => {
                    contentPenalty += 1;
                    details.push(`'${w}' 불필요한 단어 (-1점)`);
                });
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
                    <span><span style="color:#7c3aed;">●</span> 불필요한 단어</span>
                    <span style="color:#aaa;">※ 띄어쓰기 무관</span>
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
