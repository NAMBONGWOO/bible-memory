// 전역 변수
let allVerses = [];
let currentVerses = [];
let currentIndex = 0;
let currentMode = 'practice';
let isShowing = false;

// 초기화
async function initApp() {
    try {
        const response = await fetch('data/config.json');
        const config = await response.json();
        const selectEl = document.getElementById('data-select');
        config.forEach(item => {
            const option = document.createElement('option');
            option.value = item.file; option.innerText = item.name;
            selectEl.appendChild(option);
        });
        loadData(config[0].file);
    } catch (e) { loadData('nav_60.json'); }
}

// 메뉴 토글
function toggleMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const isOpen = sideMenu.classList.contains('open');
    sideMenu.classList.toggle('open', !isOpen);
    overlay.style.display = !isOpen ? 'block' : 'none';
}

// 데이터 로드
async function loadData(fileName) {
    const response = await fetch('data/' + fileName);
    allVerses = await response.json();
    generatePracticePartButtons();
    if(currentMode === 'practice') filterPart('A');
}

// 모드 전환
function setMode(mode) {
    currentMode = mode;
    document.getElementById('mode-title').innerText = mode === 'practice' ? '암송 카드 (연습)' : '암송 테스트 (시험)';
    document.getElementById('test-setup').style.display = mode === 'test' ? 'flex' : 'none';
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('check-btn').style.display = 'none';
    document.getElementById('status-panel').style.display = 'none';
    document.getElementById('part-container').style.display = mode === 'test' ? 'none' : 'flex';
    document.getElementById('next-btn').innerText = mode === 'test' ? '다음 구절' : '다음';
    document.getElementById('prev-btn').style.visibility = mode === 'test' ? 'hidden' : 'visible';

    if(mode === 'test') {
        generatePartCheckboxes(); // test.js에 정의된 함수 호출
    } else {
        toggleMenu();
        filterPart('A');
    }
}

// 연습 모드용 파트 버튼
function generatePracticePartButtons() {
    const container = document.getElementById('part-container');
    const parts = [...new Set(allVerses.map(v => v.p))];
    container.innerHTML = '';
    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn'; btn.innerText = p + "파트";
        btn.onclick = () => filterPart(p);
        container.appendChild(btn);
    });
}

function filterPart(part) {
    currentVerses = allVerses.filter(v => v.p === part);
    currentIndex = 0; updateCard();
    document.querySelectorAll('.part-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.includes(part)));
}

// 카드 업데이트
function updateCard() {
    const v = currentVerses[currentIndex];
    if(!v) return;
    const idEl = document.getElementById('v-id');
    const themeEl = document.getElementById('v-theme');
    idEl.innerText = v.id; themeEl.innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    
    if(currentMode === 'test') { 
        idEl.style.display = 'none'; themeEl.style.display = 'none'; 
    } else { 
        idEl.style.display = 'block'; themeEl.style.display = 'block'; 
    }
    
    document.getElementById('v-content').style.display = 'none';
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('score-text').style.display = 'none';
    document.getElementById('input-theme').value = "";
    document.getElementById('input-content').value = "";
    document.getElementById('v-page').innerText = currentMode === 'practice' ? `${currentIndex + 1} / ${currentVerses.length}` : "테스트 중";
}

function handleCardClick() {
    if(currentMode === 'practice') {
        const content = document.getElementById('v-content');
        isShowing = !isShowing;
        content.style.display = isShowing ? 'block' : 'none';
    }
}

function prevVerse() { if(currentMode === 'practice' && currentIndex > 0) { currentIndex--; updateCard(); } }

// 다음 버튼 핸들러
function handleNext() {
    if(currentMode === 'test') {
        nextTestVerse(); // test.js 함수
    } else if (currentIndex < currentVerses.length - 1) { 
        currentIndex++; updateCard(); 
    }
}

initApp();