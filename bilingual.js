// ─── 암송연습 2: 한/영 통합 (경량 버전) ──────────────────────────────────
// [리팩터링] 별도 화면을 만들지 않고 암송연습1(app-main-view)을 그대로 재사용한다.
// window.currentMode === 'bilingual' 일 때:
//   - window.verses에는 한글 데이터가 그대로 들어간다 (기존 슬라이드/화살표/
//     스와이프/자동공개 토글 로직이 practice.js 그대로 작동)
//   - 길게 누르면 같은 카드 안에서 언어만 한글⇄영어로 바꿔치기한다 (전환 애니메이션 없음,
//     기존 카드 슬라이드/뒤집기 애니메이션과 충돌하지 않도록 텍스트만 교체)
//   - 짝 코스 목록은 config_bilingual.json, id 매칭으로 영어 항목을 찾는다

let blPairs = [];          // config_bilingual.json 목록 [{name, ko, en}]
let blEnByFile = {};       // { 'nav_60_en.json': [verse, ...] } 캐시
let blCurrentEnFile = null;
let blIsEnglish = false;   // 현재 뒤집혀서 영어를 보고 있는지

// ─── 암송연습2 진입 시 초기화 — app.js의 setMode('bilingual')에서 호출 ──
window.initBilingualMode = async () => {
    if (blPairs.length === 0) {
        await loadBilingualConfig();
    }
    blIsEnglish = false;
    updateLangBadge();

    // 짝이 있는 코스인지 확인 — 현재 선택된 코스 파일 기준
    const currentFile = document.getElementById('data-select')?.value;
    const pair = blPairs.find(p => p.ko === currentFile);

    if (pair) {
        blCurrentEnFile = pair.en;
        await ensureEnglishLoaded(pair.en);
    } else if (blPairs.length > 0) {
        // 현재 코스가 짝이 없으면, 짝이 있는 첫 코스로 전환
        const sel = document.getElementById('data-select');
        if (sel) {
            sel.value = blPairs[0].ko;
            window.syncDataSelects(blPairs[0].ko);
            await window.loadData(blPairs[0].ko);
        }
        blCurrentEnFile = blPairs[0].en;
        await ensureEnglishLoaded(blPairs[0].en);
    } else {
        alert('한/영 짝 데이터가 없습니다.');
    }
};

async function loadBilingualConfig() {
    try {
        const res = await fetch('data/config_bilingual.json');
        blPairs = await res.json();
    } catch (e) {
        console.error('config_bilingual.json 로드 실패:', e);
        blPairs = [];
    }
}

async function ensureEnglishLoaded(enFile) {
    if (blEnByFile[enFile]) return;
    try {
        const res = await fetch(`data/${enFile}`);
        blEnByFile[enFile] = await res.json();
    } catch (e) {
        console.error(`${enFile} 로드 실패:`, e);
        blEnByFile[enFile] = [];
    }
}

// ─── [요청] 코스를 바꿨을 때 영어 짝 파일 갱신 — app.js의 loadData에서 호출 ─
window.syncBilingualPair = async (koFile) => {
    if (blPairs.length === 0) await loadBilingualConfig();
    const pair = blPairs.find(p => p.ko === koFile);
    if (!pair) {
        blCurrentEnFile = null;
        return;
    }
    blCurrentEnFile = pair.en;
    await ensureEnglishLoaded(pair.en);
    blIsEnglish = false;
    updateLangBadge();
};

// ─── 현재 카드의 id로 영어 항목 찾기 ────────────────────────────────────
function findEnglishVerse(koVerse) {
    if (!blCurrentEnFile || !koVerse) return null;
    const enList = blEnByFile[blCurrentEnFile] || [];
    return enList.find(v => v.id === koVerse.id) || null;
}

// ─── 언어 뱃지 표시/갱신 ─────────────────────────────────────────────────
function updateLangBadge() {
    const badge = document.getElementById('lang-badge');
    if (!badge) return;
    const isBilingual = window.currentMode === 'bilingual';
    badge.style.display = isBilingual ? 'block' : 'none';
    badge.innerText = blIsEnglish ? 'English' : '한글';
}

// ─── 카드가 갱신될 때마다(다음/이전/스와이프 등) 언어 상태 리셋 ─────────
// practice.js의 updateCardUI 끝에서 호출된다 (아래 훅 참고)
window.onBilingualCardChanged = () => {
    if (window.currentMode !== 'bilingual') return;
    blIsEnglish = false; // 카드 전환 시 항상 한글면부터 다시 시작
    updateLangBadge();
};

// ─── 길게 누르면 언어 전환 ───────────────────────────────────────────────
// practice-area에 이미 스와이프/탭 핸들러가 있으므로, 그 안에서 판단하지 않고
// 여기서 독립적인 롱프레스 리스너를 추가로 붙인다 (탭/스와이프 판정과는 무관하게
// "제자리에서 오래 누름"만 감지).
(function initBilingualLongPress() {
    const LONG_PRESS_MS  = 400;
    const MOVE_CANCEL_PX = 12;
    let startX = 0, startY = 0, pressTimer = null, active = false;

    function attach() {
        const area = document.getElementById('practice-area');
        if (!area || area.dataset.langPressBound) return;
        area.dataset.langPressBound = 'true';

        const start = (x, y) => {
            if (window.currentMode !== 'bilingual') return;
            startX = x; startY = y; active = true;
            pressTimer = setTimeout(() => {
                if (!active) return;
                toggleBilingualLanguage();
                active = false;
            }, LONG_PRESS_MS);
        };
        const move = (x, y) => {
            if (!active) return;
            if (Math.abs(x - startX) > MOVE_CANCEL_PX || Math.abs(y - startY) > MOVE_CANCEL_PX) {
                clearTimeout(pressTimer);
                active = false;
            }
        };
        const cancel = () => { clearTimeout(pressTimer); active = false; };

        area.addEventListener('touchstart', (e) => {
            const t = e.touches[0]; start(t.clientX, t.clientY);
        }, { passive: true });
        area.addEventListener('touchmove', (e) => {
            const t = e.touches[0]; move(t.clientX, t.clientY);
        }, { passive: true });
        area.addEventListener('touchend', cancel);

        area.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
        area.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
        area.addEventListener('mouseup', cancel);
        area.addEventListener('mouseleave', cancel);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();

// ─── 언어 전환 실행 ──────────────────────────────────────────────────────
function toggleBilingualLanguage() {
    if (!window.verses || window.currentIndex == null) return;
    const koVerse = window.verses[window.currentIndex];
    const enVerse = findEnglishVerse(koVerse);
    if (!enVerse) return;

    blIsEnglish = !blIsEnglish;
    const showVerse = blIsEnglish ? enVerse : koVerse;

    // 기존 카드 요소들에 텍스트만 교체 — 슬라이드/뒤집기 애니메이션과 무관
    document.getElementById('v-ref').innerText   = showVerse.ref   || '';
    document.getElementById('v-theme').innerText = showVerse.theme || '';
    document.getElementById('v-content').innerText = showVerse.content || '';

    updateLangBadge();
}
