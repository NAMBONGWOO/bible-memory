// 전역 변수 설정 (app.js와 공유)
window.verses = [];      // 현재 선택된 파트의 구절들
window.currentIndex = 0; // 현재 보고 있는 카드의 인덱스

// [1] 파트 버튼 생성 함수
window.generatePartButtons = () => {
    const container = document.getElementById('part-container');
    if (!container || !window.allVerses) return;

    container.innerHTML = "";
    // 데이터에서 유니크한 파트(p) 목록 추출 (예: Series 1, DEP 1 등)
    const parts = [...new Set(window.allVerses.map(v => v.p))];

    parts.forEach(part => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.innerText = part;
        btn.onclick = () => window.filterPart(part);
        container.appendChild(btn);
    });
};

// [2] 특정 파트로 구절 필터링
window.filterPart = (partName) => {
    window.verses = window.allVerses.filter(v => v.p === partName);
    window.currentIndex = 0;
    
    // 버튼 활성화 스타일 처리
    const btns = document.querySelectorAll('.part-btn');
    btns.forEach(b => {
        b.classList.toggle('active', b.innerText === partName);
    });

    window.updateCardUI(window.verses[window.currentIndex]);
};

// [3] 카드 클릭 시 내용 보이기/숨기기 (연습 모드)
window.handleCardClick = () => {
    const content = document.getElementById('v-content');
    if (content) {
        content.style.display = (content.style.display === 'none') ? 'block' : 'none';
    }
};

// [4] 다음 구절로 이동
window.handleNext = () => {
    if (!window.verses || window.verses.length === 0) return;
    
    if (window.currentIndex < window.verses.length - 1) {
        window.currentIndex++;
        window.updateCardUI(window.verses[window.currentIndex]);
    } else {
        alert("이 파트의 마지막 구절입니다.");
    }
};

// [5] 이전 구절로 이동
window.prevVerse = () => {
    if (window.currentIndex > 0) {
        window.currentIndex--;
        window.updateCardUI(window.verses[window.currentIndex]);
    }
};

// [6] UI 업데이트 (데이터를 화면에 그리는 핵심 함수)
window.updateCardUI = (verse) => {
    if (!verse) return;

    const vId = document.getElementById('v-id');
    const vTheme = document.getElementById('v-theme');
    const vRef = document.getElementById('v-ref');
    const vContent = document.getElementById('v-content');
    const vPage = document.getElementById('v-page');

    if (vId) vId.innerText = verse.id || "-";
    if (vTheme) vTheme.innerText = verse.theme || "";
    if (vRef) vRef.innerText = verse.ref || "";
    if (vContent) {
        vContent.innerText = verse.content || "";
        vContent.style.display = 'none'; // 다음 카드로 넘어가면 내용은 다시 숨김
    }
    
    // 하단 페이지 정보 (예: 1 / 36) 업데이트
    if (vPage) {
        vPage.innerText = `${window.currentIndex + 1} / ${window.verses.length}`;
    }
};