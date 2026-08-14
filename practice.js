// ─── 카드 UI 업데이트 ────────────────────────────────────────────────────
window.updateCardUI = (verse) => {
    if (!verse) return;

    document.getElementById('v-id').innerText    = verse.id      || '';
    document.getElementById('v-theme').innerText = verse.theme   || '';
    document.getElementById('v-ref').innerText   = verse.ref     || '';

    const content = document.getElementById('v-content');
    content.innerText = verse.content || '';

    if (window.currentMode === 'practice') {
        content.style.display = 'none';
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

// ─── 이전 / 다음 구절 ────────────────────────────────────────────────────
window.handleNext = () => {
    if (!window.verses || window.currentIndex >= window.verses.length - 1) return;
    window.currentIndex++;
    window.updateCardUI(window.verses[window.currentIndex]);
};

window.prevVerse = () => {
    if (!window.verses || window.currentIndex <= 0) return;
    window.currentIndex--;
    window.updateCardUI(window.verses[window.currentIndex]);
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

            const t = e.changedTouches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
                // 탭: 본문 토글
                window.handleCardClick();
            } else if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
                // 스와이프: 좌/우 전환
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
