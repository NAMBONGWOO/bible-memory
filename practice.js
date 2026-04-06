// ─── 카드 UI 업데이트 ────────────────────────────────────────────────────
// [버그 수정] 'test-area', 'test-input', 'test-result' → 실제 HTML ID로 교체
window.updateCardUI = (verse) => {
    if (!verse) return;

    document.getElementById('v-id').innerText    = verse.id      || '';
    document.getElementById('v-theme').innerText = verse.theme   || '';
    document.getElementById('v-ref').innerText   = verse.ref     || '';

    const content = document.getElementById('v-content');
    content.innerText = verse.content || '';

    if (window.currentMode === 'practice') {
        // 연습 모드: 본문 숨김 (클릭으로 토글)
        content.style.display = 'none';

        // 테스트 입력 영역 숨김
        document.getElementById('test-section').style.display = 'none';
        document.getElementById('practice-area').style.display = 'block';

    } else {
        // 테스트 모드: 정답(본문) 숨김, 입력창 초기화
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
};

// ─── 연습 카드 클릭: 본문 토글 ───────────────────────────────────────────
window.handleCardClick = () => {
    if (window.currentMode === 'practice') {
        const content = document.getElementById('v-content');
        if (content) {
            content.style.display = (content.style.display === 'none') ? 'block' : 'none';
        }
    }
    // 테스트 모드에서는 클릭해도 정답 미표시
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
