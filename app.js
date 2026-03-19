import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 사용자님의 출입증 (Firebase Config)
const firebaseConfig = {
    apiKey: "AIzaSyAPuQQcX0mT1fqAa97CPPbhTy9GWdG8_J0",
    authDomain: "bible-memory-app-4e246.firebaseapp.com",
    projectId: "bible-memory-app-4e246",
    storageBucket: "bible-memory-app-4e246.firebasestorage.app",
    messagingSenderId: "112274931775",
    appId: "1:112274931775:web:e63478c296f7a702d6f88a",
    measurementId: "G-LXD25M9ER2"
};

// 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 전역 변수 (기존 로직 연결을 위해 window 객체에 할당)
window.allVerses = [];
window.currentVerses = [];
window.currentIndex = 0;
window.currentMode = 'practice';
window.currentUser = null;

// --- [로그인/회원가입 기능] ---
window.handleSignUp = () => {
    const email = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pw').value;
    createUserWithEmailAndPassword(auth, email, pw)
        .catch(err => document.getElementById('auth-error').innerText = "가입 실패: " + err.message);
};

window.handleLogin = () => {
    const email = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pw').value;
    signInWithEmailAndPassword(auth, email, pw)
        .catch(err => document.getElementById('auth-error').innerText = "로그인 실패: " + err.message);
};

window.handleLogout = () => signOut(auth);

// 인증 상태 감시 (로그인 하면 앱 보여주기)
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.currentUser = user;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'flex';
        document.getElementById('user-name').innerText = user.email.split('@')[0] + "님 환영합니다";
        initApp(); // 앱 시작
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

// --- [기존 앱 로직 통합] ---
async function initApp() {
    try {
        const response = await fetch('data/config.json');
        const config = await response.json();
        const selectEl = document.getElementById('data-select');
        selectEl.innerHTML = "";
        config.forEach(item => {
            const option = document.createElement('option');
            option.value = item.file; option.innerText = item.name;
            selectEl.appendChild(option);
        });
        loadData(config[0].file);
    } catch (e) { loadData('nav_60.json'); }
}

window.loadData = async (fileName) => {
    const response = await fetch('data/' + fileName);
    window.allVerses = await response.json();
    generatePracticePartButtons();
    if(window.currentMode === 'practice') filterPart('A');
};

window.toggleMenu = () => {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const isOpen = sideMenu.classList.contains('open');
    sideMenu.classList.toggle('open', !isOpen);
    overlay.style.display = !isOpen ? 'block' : 'none';
};

window.setMode = (mode) => {
    window.currentMode = mode;
    document.getElementById('mode-title').innerText = mode === 'practice' ? '암송 카드 (연습)' : '암송 테스트 (시험)';
    document.getElementById('test-setup').style.display = mode === 'test' ? 'flex' : 'none';
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('check-btn').style.display = 'none';
    document.getElementById('status-panel').style.display = 'none';
    document.getElementById('part-container').style.display = mode === 'test' ? 'none' : 'flex';
    document.getElementById('next-btn').innerText = mode === 'test' ? '다음 구절' : '다음';
    document.getElementById('prev-btn').style.visibility = mode === 'test' ? 'hidden' : 'visible';
    if(mode === 'test') { generatePartCheckboxes(); } else { filterPart('A'); }
};

function generatePracticePartButtons() {
    const container = document.getElementById('part-container');
    const parts = [...new Set(window.allVerses.map(v => v.p))];
    container.innerHTML = '';
    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn'; btn.innerText = p + "파트";
        btn.onclick = () => filterPart(p);
        container.appendChild(btn);
    });
}

window.filterPart = (part) => {
    window.currentVerses = window.allVerses.filter(v => v.p === part);
    window.currentIndex = 0; updateCard();
    document.querySelectorAll('.part-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.includes(part)));
};

window.updateCard = () => {
    const v = window.currentVerses[window.currentIndex];
    if(!v) return;
    const idEl = document.getElementById('v-id');
    const themeEl = document.getElementById('v-theme');
    idEl.innerText = v.id; themeEl.innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    
    if(window.currentMode === 'test') { idEl.style.display = 'none'; themeEl.style.display = 'none'; }
    else { idEl.style.display = 'block'; themeEl.style.display = 'block'; }
    
    document.getElementById('v-content').style.display = 'none';
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('score-text').style.display = 'none';
    document.getElementById('input-theme').value = "";
    document.getElementById('input-content').value = "";
    document.getElementById('v-page').innerText = `${window.currentIndex + 1} / ${window.currentVerses.length}`;
};

window.handleCardClick = () => {
    if(window.currentMode === 'practice') {
        const content = document.getElementById('v-content');
        const isShown = content.style.display === 'block';
        content.style.display = isShown ? 'none' : 'block';
    }
};

window.prevVerse = () => { if(window.currentIndex > 0) { window.currentIndex--; updateCard(); } };
window.handleNext = () => {
    if(window.currentMode === 'test') { nextTestVerse(); } 
    else if (window.currentIndex < window.currentVerses.length - 1) { window.currentIndex++; updateCard(); }
};