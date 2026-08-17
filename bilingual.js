// ─── 암송연습 2: 한/영 통합 카드 모듈 ────────────────────────────────────
// 기존 nav_60.json(한글) / nav_60_en.json(영어)를 같은 id 기준으로 짝지어
// 하나의 카드 양면(앞:한글, 뒤:영어)으로 보여준다.
// 기존 암송연습 1(practice.js)과 완전히 분리되어 서로 영향을 주지 않는다.

let blPairs = [];      // config_bilingual.json 목록
let blAllKo = [];      // 현재 코스 전체 한글 배열 (파트 필터 전)
let blAllEn = [];      // 현재 코스 전체 영어 배열 (같은 인덱스가 같은 id)
let blKoVerses = [];   // 현재 파트로 필터링된 한글 배열
let blEnVerses = [];   // 현재 파트로 필터링된 영어 배열
let blIndex = 0;
let blRevealOn = localStorage.getItem('bilingualRevealOn') === 'true';
let blFlipped = false;

// ─── 화면 열기 / 닫기 ────────────────────────────────────────────────────
window.openBilingualScreen = async () => {
    window.toggleMenu();
    document.getElementById('bilingual-screen').style.display = 'flex';
    document.getElementById('app-main-view').style.display = 'none';
    const mainTopBar = document.getElementById('main-top-bar');
    if (mainTopBar) mainTopBar.style.display = 'none';

    updateBilingualToggleUI();

    if (blPairs.length === 0) {
        await loadBilingualConfig();
    }
    if (blAllKo.length === 0 && blPairs.length > 0) {
        await loadBilingualCourse(blPairs[0].ko);
    } else {
        renderBilingualCard();
    }
};

window.closeBilingualScreen = () => {
    document.getElementById('bilingual-screen').style.display = 'none';
    document.getElementById('app-main-view').style.display = 'flex';
    const mainTopBar = document.getElementById('main-top-bar');
    if (mainTopBar) mainTopBar.style.display = 'flex';
};

// ─── 짝 목록(config_bilingual.json) 로드 → 코스 드롭다운 채우기 ──────────
async function loadBilingualConfig() {
    const sel = document.getElementById('bilingual-course-select');
    try {
        const res = await fetch('data/config_bilingual.json');
        blPairs = await res.json();
        sel.innerHTML = blPairs.map(p => `<option value="${p.ko}">${p.name}</option>`).join('');
    } catch (e) {
        console.error('config_bilingual.json 로드 실패:', e);
        sel.innerHTML = '<option value="">불러올 수 없음</option>';
    }
}

// ─── 선택한 코스의 한글/영어 파일을 각각 로드하고 id로 짝짓기 ───────────
window.loadBilingualCourse = async (koFile) => {
    const pair = blPairs.find(p => p.ko === koFile);
    if (!pair) return;

    try {
        const [koRes, enRes] = await Promise.all([
            fetch(`data/${pair.ko}`),
            fetch(`data/${pair.en}`)
        ]);
        const koData = await koRes.json();
        const enData = await enRes.json();

        // id 기준으로 영어 항목을 빠르게 찾기 위한 매핑
        const enById = new Map(enData.map(v => [v.id, v]));

        // 한글 순서를 기준으로, 같은 id의 영어 항목을 나란히 정렬
        blAllKo = [];
        blAllEn = [];
        koData.forEach(ko => {
            const en = enById.get(ko.id);
            if (en) {
                blAllKo.push(ko);
                blAllEn.push(en);
            }
        });

        generateBilingualPartButtons();

        // 첫 번째 파트로 시작 (파트 정보가 없으면 전체를 하나로 취급)
        const firstPart = blAllKo.length > 0 ? blAllKo[0].p : null;
        filterBilingualPart(firstPart);
    } catch (e) {
        console.error('한/영 데이터 로드 실패:', e);
        alert('데이터를 불러올 수 없습니다.');
    }
};

// ─── [요청] 소주제 파트 버튼 생성 (암송연습1의 generatePartButtons와 동일 방식) ─
function generateBilingualPartButtons() {
    const container = document.getElementById('bilingual-part-container');
    if (!container) return;
    container.innerHTML = '';

    const parts = [...new Set(blAllKo.map(v => v.p))];
    if (parts.length <= 1) {
        // 파트가 하나뿐이거나 없으면 버튼 자체를 표시하지 않음
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';

    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.innerText = p;
        btn.onclick = () => filterBilingualPart(p);
        container.appendChild(btn);
    });
}

// ─── 파트 필터링 ─────────────────────────────────────────────────────────
function filterBilingualPart(part) {
    if (part) {
        blKoVerses = blAllKo.filter(v => v.p === part);
        blEnVerses = blAllEn.filter((_, i) => blAllKo[i].p === part);
    } else {
        blKoVerses = blAllKo;
        blEnVerses = blAllEn;
    }

    document.querySelectorAll('#bilingual-part-container .part-btn').forEach(b =>
        b.classList.toggle('active', b.innerText === part)
    );

    blIndex = 0;
    blFlipped = false;
    renderBilingualCard();
}

// ─── 카드 렌더링 ─────────────────────────────────────────────────────────
function renderBilingualCard() {
    if (blKoVerses.length === 0) return;

    const ko = blKoVerses[blIndex];
    const en = blEnVerses[blIndex];

    document.getElementById('bl-ko-ref').innerText    = ko.ref   || '';
    document.getElementById('bl-ko-theme').innerText  = ko.theme || '';
    document.getElementById('bl-ko-content').innerText = ko.content || '';

    document.getElementById('bl-en-ref').innerText    = en.ref   || '';
    document.getElementById('bl-en-theme').innerText  = en.theme || '';
    document.getElementById('bl-en-content').innerText = en.content || '';

    // [요청] 자동 본문보이기 토글에 따라 내용 표시 여부 결정
    document.getElementById('bl-ko-content').style.display = blRevealOn ? 'block' : 'none';
    document.getElementById('bl-en-content').style.display = blRevealOn ? 'block' : 'none';

    document.getElementById('bilingual-page').innerText = `${blIndex + 1} / ${blKoVerses.length}`;
}

// ─── 이전 / 다음 ─────────────────────────────────────────────────────────
window.nextBilingual = () => {
    if (blIndex >= blKoVerses.length - 1) return;
    blIndex++;
    resetFlipState();
    renderBilingualCard();
};

window.prevBilingual = () => {
    if (blIndex <= 0) return;
    blIndex--;
    resetFlipState();
    renderBilingualCard();
};

// 카드 전환 시 항상 한글면(앞면)으로 리셋 — 매번 뒤집힌 채로 시작하면 헷갈림
function resetFlipState() {
    blFlipped = false;
    const card = document.getElementById('bilingual-card');
    if (card) card.classList.remove('flipped');
}

// ─── 본문 보이기 토글 (헤더 스위치) ──────────────────────────────────────
window.toggleBilingualReveal = () => {
    blRevealOn = !blRevealOn;
    localStorage.setItem('bilingualRevealOn', blRevealOn);
    updateBilingualToggleUI();
    renderBilingualCard();
};

function updateBilingualToggleUI() {
    const toggleEl = document.getElementById('bilingual-reveal-toggle');
    if (toggleEl) toggleEl.classList.toggle('on', blRevealOn);
}

// ─── 길게 누르면 한/영 뒤집기 ────────────────────────────────────────────
(function initLongPressFlip() {
    const LONG_PRESS_MS = 400;
    let pressTimer = null;

    function attach() {
        const card = document.getElementById('bilingual-card');
        if (!card || card.dataset.flipBound) return;
        card.dataset.flipBound = 'true';

        const start = () => {
            pressTimer = setTimeout(() => {
                blFlipped = !blFlipped;
                card.classList.toggle('flipped', blFlipped);
            }, LONG_PRESS_MS);
        };
        const cancel = () => clearTimeout(pressTimer);

        card.addEventListener('touchstart', start, { passive: true });
        card.addEventListener('touchend', cancel);
        card.addEventListener('touchmove', cancel);
        card.addEventListener('mousedown', start);
        card.addEventListener('mouseup', cancel);
        card.addEventListener('mouseleave', cancel);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();
