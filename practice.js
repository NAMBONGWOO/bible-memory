let isShowing = false;

window.generatePartButtons = () => {
    const container = document.getElementById('part-container');
    const parts = [...new Set(window.allVerses.map(v => v.p))];
    container.innerHTML = parts.map(p => 
        `<button class="part-btn" onclick="filterPart('${p}')">${p}파트</button>`
    ).join('');
};

window.filterPart = (part) => {
    window.currentVerses = window.allVerses.filter(v => v.p === part);
    window.currentIndex = 0;
    updateCard();
    document.querySelectorAll('.part-btn').forEach(btn => 
        btn.classList.toggle('active', btn.innerText.includes(part))
    );
};

window.updateCard = () => {
    const v = window.currentVerses[window.currentIndex];
    if(!v) return;
    updateCardUI(v);
    isShowing = false;
    document.getElementById('v-page').innerText = (window.currentIndex + 1) + " / " + window.currentVerses.length;
};

window.handleCardClick = () => {
    if(window.currentMode === 'practice') {
        const content = document.getElementById('v-content');
        isShowing = !isShowing;
        content.style.display = isShowing ? 'block' : 'none';
    }
};

window.prevVerse = () => {
    if(window.currentMode === 'practice' && window.currentIndex > 0) { 
        window.currentIndex--; 
        updateCard(); 
    }
};