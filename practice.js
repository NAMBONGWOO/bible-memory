window.updateCardUI = (verse) => {
    if(!verse) return;
    document.getElementById('v-id').innerText = verse.id;
    document.getElementById('v-theme').innerText = verse.theme;
    document.getElementById('v-ref').innerText = verse.ref;
    
    const content = document.getElementById('v-content');
    content.innerText = verse.content;
    
    // 모드에 따른 처리
    if(window.currentMode === 'practice') {
        content.style.display = 'none'; // 연습 시 기본 숨김
        document.getElementById('test-area').style.display = 'none';
    } else {
        content.style.display = 'none'; // 테스트 시 정답은 숨김
        document.getElementById('test-area').style.display = 'block';
        document.getElementById('test-input').value = "";
        document.getElementById('test-result').innerText = "";
    }

    document.getElementById('v-page').innerText = `${window.currentIndex + 1} / ${window.verses.length}`;
};

window.handleCardClick = () => {
    if (window.currentMode === 'practice') {
        const content = document.getElementById('v-content');
        if (content) {
            content.style.display = (content.style.display === 'none') ? 'block' : 'none';
        }
    }
    // 테스트 모드일 때는 클릭해도 정답이 보이지 않음
};
window.generatePartButtons = () => {
    const container = document.getElementById('part-container');
    container.innerHTML = "";
    const parts = [...new Set(window.allVerses.map(v => v.p))];
    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.innerText = p;
        btn.onclick = () => window.filterPart(p);
        container.appendChild(btn);
    });
};

window.filterPart = (p) => {
    window.verses = window.allVerses.filter(v => v.p === p);
    window.currentIndex = 0;
    document.querySelectorAll('.part-btn').forEach(b => b.classList.toggle('active', b.innerText === p));
    window.updateCardUI(window.verses[0]);
};

window.handleNext = () => {
    if(window.currentIndex < window.verses.length - 1) {
        window.currentIndex++;
        window.updateCardUI(window.verses[window.currentIndex]);
    }
};

window.prevVerse = () => {
    if(window.currentIndex > 0) {
        window.currentIndex--;
        window.updateCardUI(window.verses[window.currentIndex]);
    }
};