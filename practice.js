// ─── 카드 UI 업데이트 ────────────────────────────────────────────────────
window.updateCardUI = (verse) => {
    if (!verse) return;

    document.getElementById('v-id').innerText    = verse.id      || '';
    document.getElementById('v-theme').innerText = verse.theme   || '';
    document.getElementById('v-ref').innerText   = verse.ref     || '';

    const content = document.getElementById('v-content');
    content.innerText = verse.content || '';

    if (window.currentMode === 'practice') {
        // [요청] 자동 공개 토글이 켜져 있으면 카드 전환 즉시 내용까지 표시
        content.style.display = window.autoRevealOn ? 'block' : 'none';
        document.getElementById('test-section').style.display = 'none';
        document.getElementById('practice-area').style.display = 'block';
    } else {
        content.style.display = 'none';
        const themeInput   = document.getElementById('test-theme-input');
        const contentInput = document.getElementById('test-content-input');
        const resultView   = document.getElementById('test-result-view');
        if (themeInput)   themeInput.value    = '';
        if (contentInput) contentInput.value  = '';
        if (resultView)   resultView.style.display = 'none';
    }

    document.getElementById('v-page').innerText =
        `${(window.currentIndex || 0) + 1} / ${(window.verses || []).length}`;

    // [요청#4] 첫/마지막 구절에서는 해당 방향 화살표 흐리게 처리
    updateSwipeArrows();

    // [요청] 연습 모드에서 마지막 위치(코스/파트/구절) 저장 — 디바운스
    if (window.currentMode === 'practice' && window.saveLastPosition) {
        window.saveLastPosition(verse);
    }
};

// ─── [요청#4] 화살표 활성/비활성 표시 ───────────────────────────────────
function updateSwipeArrows() {
    const leftArrow  = document.getElementById('swipe-arrow-left');
    const rightArrow = document.getElementById('swipe-arrow-right');
    if (!leftArrow || !rightArrow) return;

    const isTest = window.currentMode === 'test';
    // 테스트 모드에서는 화살표 숨김 (스와이프로 문제 넘기면 채점 누락 위험)
    leftArrow.style.display  = isTest ? 'none' : 'flex';
    rightArrow.style.display = isTest ? 'none' : 'flex';

    if (isTest) return;

    const idx = window.currentIndex || 0;
    const len = (window.verses || []).length;
    leftArrow.style.opacity  = idx <= 0 ? '0.25' : '1';
    rightArrow.style.opacity = idx >= len - 1 ? '0.25' : '1';
}

// ─── 연습 카드 클릭: 본문 토글 ───────────────────────────────────────────
window.handleCardClick = () => {
    if (window.currentMode === 'practice') {
        const content = document.getElementById('v-content');
        if (content) {
            content.style.display = (content.style.display === 'none') ? 'block' : 'none';
        }
    }
};

// ─── [요청] 연습 모드 - 내용 자동 공개 토글 ─────────────────────────────
// ON: 카드 전환 시 내용이 즉시 보임 (빠르게 훑어보기)
// OFF: 기존처럼 터치해야 내용이 보임
window.autoRevealOn = localStorage.getItem('autoRevealOn') === 'true';

window.toggleAutoReveal = () => {
    window.autoRevealOn = !window.autoRevealOn;
    localStorage.setItem('autoRevealOn', window.autoRevealOn);

    const toggleEl = document.getElementById('auto-reveal-toggle');
    if (toggleEl) toggleEl.classList.toggle('on', window.autoRevealOn);

    // 지금 보고 있는 카드에도 즉시 반영
    if (window.currentMode === 'practice' && window.verses && window.currentIndex != null) {
        const content = document.getElementById('v-content');
        if (content) content.style.display = window.autoRevealOn ? 'block' : 'none';
    }
};

// 페이지 로드 시 저장된 토글 상태를 스위치 모양에 반영
document.addEventListener('DOMContentLoaded', () => {
    const toggleEl = document.getElementById('auto-reveal-toggle');
    if (toggleEl) toggleEl.classList.toggle('on', window.autoRevealOn);
});

// ─── 파트 버튼 생성 ──────────────────────────────────────────────────────
window.generatePartButtons = () => {
    const container = document.getElementById('part-container');
    if (!container) return;
    container.innerHTML = '';

    const parts = [...new Set((window.allVerses || []).map(v => v.p))];
    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.innerText = p;
        btn.onclick = () => window.filterPart(p);
        container.appendChild(btn);
    });
};

// ─── 파트 필터링 ─────────────────────────────────────────────────────────
window.filterPart = (p) => {
    window.verses = (window.allVerses || []).filter(v => v.p === p);
    window.currentIndex = 0;
    document.querySelectorAll('.part-btn').forEach(b =>
        b.classList.toggle('active', b.innerText === p)
    );
    if (window.verses.length > 0) {
        window.updateCardUI(window.verses[0]);
    }
};

// ─── 이전 / 다음 구절 — 카드 슬라이드 애니메이션 ────────────────────────
// 방식: 현재 카드가 반대 방향으로 밀려나가며 사라지고,
//       다음 콘텐츠로 교체된 카드가 진행 방향에서 밀려들어옴
const SLIDE_DURATION = 260; // ms, style.css의 #main-card transition과 맞출 것
let isSliding = false;

function slideToVerse(nextIndex, direction) {
    // direction: 'next' → 카드가 왼쪽으로 나가고 오른쪽에서 들어옴
    //            'prev' → 카드가 오른쪽으로 나가고 왼쪽에서 들어옴
    if (isSliding) return;
    if (!window.verses || nextIndex < 0 || nextIndex >= window.verses.length) return;

    const card = document.getElementById('main-card');
    if (!card) {
        // 카드 엘리먼트가 없으면 즉시 전환 (안전장치)
        window.currentIndex = nextIndex;
        window.updateCardUI(window.verses[nextIndex]);
        return;
    }

    isSliding = true;
    const outX = direction === 'next' ? '-100%' : '100%';
    const inX  = direction === 'next' ? '100%'  : '-100%';

    // 1) 현재 카드를 진행 방향으로 밀어내며 페이드아웃
    card.style.transition = `transform ${SLIDE_DURATION}ms ease, opacity ${SLIDE_DURATION}ms ease`;
    card.style.transform = `translateX(${outX})`;
    card.style.opacity = '0';

    setTimeout(() => {
        // 2) 콘텐츠 교체 + 반대편에 즉시 배치 (애니메이션 없이)
        window.currentIndex = nextIndex;
        window.updateCardUI(window.verses[nextIndex]);

        card.style.transition = 'none';
        card.style.transform = `translateX(${inX})`;
        card.style.opacity = '0';

        // 강제 리플로우로 위 스타일을 즉시 반영시킨 뒤 애니메이션 시작
        void card.offsetWidth;

        // 3) 새 카드를 제자리로 밀어들어오며 페이드인
        card.style.transition = `transform ${SLIDE_DURATION}ms ease, opacity ${SLIDE_DURATION}ms ease`;
        card.style.transform = 'translateX(0)';
        card.style.opacity = '1';

        setTimeout(() => {
            card.style.transition = '';
            isSliding = false;
        }, SLIDE_DURATION);
    }, SLIDE_DURATION);
}

window.handleNext = () => {
    if (!window.verses || window.currentIndex >= window.verses.length - 1) return;
    slideToVerse(window.currentIndex + 1, 'next');
};

window.prevVerse = () => {
    if (!window.verses || window.currentIndex <= 0) return;
    slideToVerse(window.currentIndex - 1, 'prev');
};

// ─── [요청#4,5] 스와이프 + 탭 통합 터치 핸들러 ──────────────────────────
// 규칙:
//   - 이동 거리가 짧고(TAP_THRESHOLD 이하) 빠르면 → 탭으로 간주 → 본문 토글
//   - 가로 이동이 SWIPE_THRESHOLD 이상이면 → 스와이프로 간주 → 이전/다음 전환
//   - 세로 스크롤과 충돌하지 않도록 가로 이동이 세로 이동보다 클 때만 스와이프 처리
(function initSwipe() {
    const SWIPE_THRESHOLD = 50;  // px, 이 이상 가로로 밀면 스와이프
    const TAP_THRESHOLD   = 10;  // px, 이 이하 움직이면 탭으로 처리

    let startX = 0, startY = 0, startTime = 0;
    let isDragging = false;

    function attachSwipeHandlers() {
        const area = document.getElementById('practice-area');
        const card = document.getElementById('main-card');
        if (!area || !card || area.dataset.swipeBound) return;
        area.dataset.swipeBound = 'true';

        area.addEventListener('touchstart', (e) => {
            if (window.currentMode !== 'practice') return;
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startTime = Date.now();
            isDragging = true;
            card.classList.add('dragging');
        }, { passive: true });

        area.addEventListener('touchmove', (e) => {
            if (!isDragging || window.currentMode !== 'practice') return;
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            // 가로 이동이 세로 이동보다 뚜렷할 때만 카드 이동 시각효과
            if (Math.abs(dx) > Math.abs(dy)) {
                card.style.transform = `translateX(${dx * 0.3}px)`;
            }
        }, { passive: true });

        area.addEventListener('touchend', (e) => {
            if (!isDragging || window.currentMode !== 'practice') return;
            isDragging = false;
            card.classList.remove('dragging');
            card.style.transform = '';
            card.style.opacity = '';

            const t = e.changedTouches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
                // 탭: 본문 토글
                window.handleCardClick();
            } else if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
                // 스와이프: 좌/우 전환 (카드 슬라이드 애니메이션 적용)
                if (dx < 0) {
                    window.handleNext();   // 왼쪽으로 밀면 다음
                } else {
                    window.prevVerse();    // 오른쪽으로 밀면 이전
                }
            }
        });
    }

    // DOM 준비되면 바인딩 (app.js보다 먼저 로드되므로 지연 실행)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachSwipeHandlers);
    } else {
        attachSwipeHandlers();
    }
})();
