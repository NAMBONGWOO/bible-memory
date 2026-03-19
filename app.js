// 전역 변수
let allVerses = [];
let currentVerses = [];
let currentIndex = 0;
let currentMode = 'practice';

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

function toggleMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    sideMenu.classList.toggle('open');
    overlay.style.display = sideMenu.classList.contains('open') ? 'block' : 'none';
}

async function loadData(fileName) {
    const response = await fetch('data/' + fileName);
    allVerses = await response.json();
    if(typeof generatePartButtons === 'function') generatePartButtons();
    if(currentMode === 'practice') filterPart('A');
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('mode-title').innerText = mode === 'practice' ? '암송 카드 (연습)' : '암송 테스트 (시험)';
    document.getElementById('test-setup').style.display = mode === 'test' ? 'flex' : 'none';
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('check-btn').style.display = 'none';
    document.getElementById('part-container').style.display = mode === 'test' ? 'none' : 'flex';
    document.getElementById('status-panel').style.display = 'none';
    
    document.getElementById('next-btn').innerText = mode === 'test' ? '다음 구절' : '다음';
    document.getElementById('prev-btn').style.visibility = mode === 'test' ? 'hidden' : 'visible';

    if(mode === 'practice') {
        if(document.getElementById('sideMenu').classList.contains('open')) toggleMenu();
        filterPart('A');
    } else {
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('overlay').style.display = 'none';
    }
}

// 공통 카드 업데이트 함수
function updateCardUI(v) {
    const idEl = document.getElementById('v-id');
    const themeEl = document.getElementById('v-theme');
    
    idEl.innerText = v.id;
    themeEl.innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    
    if(currentMode === 'test') {
        idEl.style.display = 'none';
        themeEl.style.display = 'none';
    } else {
        idEl.style.display = 'block';
        themeEl.style.display = 'block';
    }
    
    document.getElementById('v-content').style.display = 'none';
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('score-text').style.display = 'none';
    document.getElementById('input-theme').value = "";
    document.getElementById('input-content').value = "";
}

initApp();