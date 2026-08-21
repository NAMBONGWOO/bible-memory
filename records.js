// ─── 암송 기록 모듈 ──────────────────────────────────────────────────────
// Firestore 구조:
//   users/{uid}/testLogs/{autoId}
//     - verseId, ref, theme, courseFile, penalty, date(ISO), createdAt(timestamp)
//
// 데이터 용량 관리: 문제 하나당 로그 1건이 쌓이므로 문서가 많아질 수 있음.
// 오답노트/추이 계산은 최근 500건만 읽어와서 클라이언트에서 집계 (전량 스캔 방지)

import { db, auth } from './auth.js';
import {
    collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const RECENT_LOG_LIMIT = 500;

// ─── 채점 결과 1건 기록 (test.js의 runCheck에서 호출) ──────────────────
window.logTestResult = async (verse, penalty, courseFile) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await addDoc(collection(db, 'users', user.uid, 'testLogs'), {
            verseId: verse.id || '',
            ref: verse.ref || '',
            theme: verse.theme || '',
            courseFile: courseFile || '',
            penalty: penalty,
            date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
            createdAt: Timestamp.now()
        });
    } catch (e) {
        console.warn('기록 저장 실패 (채점 결과에는 영향 없음):', e);
    }
};

// ─── 최근 로그 불러오기 ──────────────────────────────────────────────────
async function fetchRecentLogs() {
    const user = auth.currentUser;
    if (!user) return [];
    try {
        const q = query(
            collection(db, 'users', user.uid, 'testLogs'),
            orderBy('createdAt', 'desc'),
            limit(RECENT_LOG_LIMIT)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
    } catch (e) {
        console.error('기록 조회 실패:', e);
        return [];
    }
}

// ─── 진도율 계산: 코스별로 "감점 0점 받은 적 있는 구절 수 / 전체 구절 수" ─
async function computeProgress(logs) {
    const sel = document.getElementById('data-select');
    const options = sel ? Array.from(sel.options) : [];

    const results = [];
    for (const opt of options) {
        const file = opt.value;
        const name = opt.innerText;
        if (!file) continue;

        try {
            const res = await fetch(`data/${file}`);
            const verses = await res.json();
            const totalCount = verses.length;

            // 이 코스에서 감점 0으로 통과한 고유 verseId 집합
            const perfected = new Set(
                logs.filter(l => l.courseFile === file && l.penalty === 0)
                    .map(l => l.verseId)
            );
            results.push({ file, name, done: perfected.size, total: totalCount });
        } catch (e) {
            console.warn(`${file} 로드 실패:`, e);
        }
    }
    return results;
}

// ─── 최근 7일 평균 감점 추이 ─────────────────────────────────────────────
function computeWeeklyTrend(logs) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }

    return days.map(dateStr => {
        const dayLogs = logs.filter(l => l.date === dateStr);
        const avg = dayLogs.length > 0
            ? (dayLogs.reduce((s, l) => s + l.penalty, 0) / dayLogs.length)
            : null;
        const label = new Date(dateStr).toLocaleDateString('ko-KR', { weekday: 'short' });
        return { date: dateStr, avg, count: dayLogs.length, label };
    });
}

// ─── 요약 통계 ───────────────────────────────────────────────────────────
function computeSummary(logs) {
    const totalCount = logs.length;
    const avgPenalty = totalCount > 0
        ? (logs.reduce((s, l) => s + l.penalty, 0) / totalCount).toFixed(1)
        : '0.0';

    // 연속 학습일(streak): 오늘부터 거슬러 올라가며 로그가 있는 날 카운트
    const logDates = new Set(logs.map(l => l.date));
    let streak = 0;
    let cursor = new Date();
    while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (logDates.has(key)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }

    return { totalCount, avgPenalty, streak };
}

// ─── 오답 노트: 자주 틀리는 구절 Top N (감점 1점 이상 받은 횟수 기준) ────
function computeWrongList(logs, topN = 5) {
    const map = new Map(); // verseId → {ref, theme, count, lastDate}
    logs.forEach(l => {
        if (l.penalty <= 0) return; // 감점 있는 것만 오답으로 카운트
        const key = l.verseId;
        if (!map.has(key)) {
            map.set(key, { verseId: key, ref: l.ref, theme: l.theme, courseFile: l.courseFile, count: 0, lastDate: l.date });
        }
        const entry = map.get(key);
        entry.count++;
        if (l.date > entry.lastDate) entry.lastDate = l.date;
    });

    return [...map.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
}

// ─── 암송 기록 화면 열기 ─────────────────────────────────────────────────
window.openRecordsScreen = async () => {
    window.toggleMenu();
    document.getElementById('records-screen').style.display = 'block';
    document.getElementById('app-main-view').style.display = 'none';
    // [버그 수정] 메인 상단바가 기록 화면의 뒤로가기 헤더를 가리는 문제 → 함께 숨김
    const mainTopBar = document.getElementById('main-top-bar');
    if (mainTopBar) mainTopBar.style.display = 'none';

    const body = document.getElementById('records-body');
    body.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:40px 0;">기록을 불러오는 중...</p>';

    const logs = await fetchRecentLogs();
    window._recordsCache = logs; // 탭 전환 시 재사용

    renderRecordsTab('progress');
};

window.closeRecordsScreen = () => {
    document.getElementById('records-screen').style.display = 'none';
    document.getElementById('app-main-view').style.display = 'flex';
    const mainTopBar = document.getElementById('main-top-bar');
    if (mainTopBar) mainTopBar.style.display = 'flex';
};

// ─── 탭 전환 ─────────────────────────────────────────────────────────────
window.switchRecordsTab = (tab) => {
    document.querySelectorAll('.records-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    renderRecordsTab(tab);
};

async function renderRecordsTab(tab) {
    const body = document.getElementById('records-body');
    const logs = window._recordsCache || [];

    if (tab === 'progress') {
        body.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:40px 0;">진도율 계산 중...</p>';
        const progress = await computeProgress(logs);
        const summary  = computeSummary(logs);

        const overallDone  = progress.reduce((s, p) => s + p.done, 0);
        const overallTotal = progress.reduce((s, p) => s + p.total, 0);
        const overallPct   = overallTotal > 0 ? Math.round(overallDone / overallTotal * 100) : 0;

        body.innerHTML = `
            <div class="progress-card">
                <div class="progress-header">
                    <div class="progress-title">전체 암송 진도율</div>
                    <div class="progress-pct">${overallPct}%</div>
                </div>
                ${progress.map(p => `
                    <div class="course-progress-row">
                        <div class="cp-label"><span>${p.name}</span><span>${p.done} / ${p.total}</span></div>
                        <div class="cp-bar-bg"><div class="cp-bar-fill" style="width:${p.total>0 ? Math.round(p.done/p.total*100) : 0}%;"></div></div>
                    </div>
                `).join('') || '<p style="color:#94a3b8; font-size:13px;">등록된 코스가 없습니다.</p>'}
            </div>
            <div class="stat-grid">
                <div class="stat-box"><div class="stat-num">${summary.totalCount}</div><div class="stat-label">누적 테스트 문제 수</div></div>
                <div class="stat-box"><div class="stat-num">${summary.avgPenalty}</div><div class="stat-label">평균 감점/문제</div></div>
                <div class="stat-box"><div class="stat-num">🔥 ${summary.streak}</div><div class="stat-label">연속 학습일</div></div>
            </div>
        `;

    } else if (tab === 'trend') {
        const trend = computeWeeklyTrend(logs);
        const maxAvg = Math.max(1, ...trend.map(d => d.avg || 0));

        body.innerHTML = `
            <div class="chart-card">
                <div class="chart-title">최근 7일 평균 감점 추이</div>
                <div class="chart-sub">낮을수록 좋음</div>
                <div class="chart-area">
                    ${trend.map(d => `
                        <div class="bar-wrap">
                            <div class="bar-value">${d.avg !== null ? d.avg.toFixed(1) : '-'}</div>
                            <div class="bar" style="height:${d.avg !== null ? Math.max(6, d.avg/maxAvg*100) : 4}%; ${d.avg === null ? 'background:#e2e8f0;' : ''}"></div>
                            <div class="bar-label">${d.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

    } else if (tab === 'wrong') {
        const wrongList = computeWrongList(logs, 10);

        body.innerHTML = `
            <div class="section-label">
                <span>자주 틀리는 구절</span>
                ${wrongList.length > 0 ? `<button class="practice-wrong-btn" onclick="startWrongPractice()">오답만 연습하기</button>` : ''}
            </div>
            ${wrongList.length === 0
                ? '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:30px 0;">아직 틀린 구절이 없어요!</p>'
                : wrongList.map(w => `
                    <div class="wrong-item">
                        <div class="wrong-item-top">
                            <span class="wrong-ref">${w.ref}</span>
                            <span class="wrong-count-badge">${w.count}회 틀림</span>
                        </div>
                        <div class="wrong-theme">${w.theme}</div>
                        <div class="wrong-last-date">최근 오답: ${w.lastDate}</div>
                    </div>
                `).join('')
            }
        `;
        window._wrongListCache = wrongList;
    }
}

// ─── 오답만 모아서 연습 모드 진입 ────────────────────────────────────────
window.startWrongPractice = async () => {
    const wrongList = window._wrongListCache || [];
    if (wrongList.length === 0) return;

    // 오답 구절들의 실제 원문(content 포함)을 각 코스 파일에서 찾아온다
    const byFile = new Map();
    wrongList.forEach(w => {
        if (!byFile.has(w.courseFile)) byFile.set(w.courseFile, []);
        byFile.get(w.courseFile).push(w.verseId);
    });

    const collected = [];
    for (const [file, verseIds] of byFile) {
        try {
            const res = await fetch(`data/${file}`);
            const verses = await res.json();
            verses.filter(v => verseIds.includes(v.id)).forEach(v => collected.push(v));
        } catch (e) {
            console.warn(`${file} 로드 실패:`, e);
        }
    }

    if (collected.length === 0) {
        alert('오답 구절 데이터를 불러올 수 없습니다.');
        return;
    }

    // 기존 연습 모드 화면을 재사용
    window.closeRecordsScreen();
    window.currentMode = 'practice';
    window.allVerses = collected;
    window.verses = collected;
    window.currentIndex = 0;

    document.getElementById('mode-title').innerText = '오답 노트 연습';
    document.getElementById('test-setup').style.display = 'none';
    document.getElementById('practice-area').style.display = 'block';
    document.getElementById('practice-controls').style.display = 'flex';
    document.getElementById('test-controls').style.display = 'none';
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('status-panel').style.display = 'none';
    document.getElementById('part-scroll-wrap').style.display = 'none'; // 오답 모음엔 파트 구분 없음

    window.updateCardUI(window.verses[0]);
};
