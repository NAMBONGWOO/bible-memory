let isShowing = false;

function generatePartButtons() {
    const container = document.getElementById('part-container');
    const parts = [...new Set(allVerses.map(v => v.p))];
    container.innerHTML = '';
    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.innerText = p + "파트";
        btn.onclick = () => filterPart(p);
        container.appendChild(btn);
    });
}

function filterPart(part) {
    currentVerses = allVerses.filter(v => v.p === part);
    currentIndex = 0;
    updateCard();
    document.querySelectorAll('.part-btn').forEach(btn => 
        btn.classList.toggle('active', btn.innerText.includes(part))
    );
}

function updateCard() {
    const v = currentVerses[currentIndex];
    if(!v) return;
    
    updateCardUI(v); // app.js의 공통 UI 업데이트 호출
    isShowing = false;
    
    if(currentMode === 'practice') {
        document.getElementById('v-page').innerText = (currentIndex + 1) + " / " + currentVerses.length;
    }
}

function handleCardClick() {
    if(currentMode === 'practice') {
        const content = document.getElementById('v-content');
        isShowing = !isShowing;
        content.style.display = isShowing ? 'block' : 'none';
    }
}

function prevVerse() {
    if(currentMode === 'practice' && currentIndex > 0) { 
        currentIndex--; 
        updateCard(); 
    }
}