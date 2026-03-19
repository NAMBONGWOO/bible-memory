import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAPuQQcX0mT1fqAa97CPPbhTy9GWdG8_J0",
    authDomain: "bible-memory-app-4e246.firebaseapp.com",
    projectId: "bible-memory-app-4e246",
    storageBucket: "bible-memory-app-4e246.firebasestorage.app",
    messagingSenderId: "112274931775",
    appId: "1:112274931775:web:e63478c296f7a702d6f88a",
    measurementId: "G-LXD25M9ER2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 글로벌 상태 변수
window.allVerses = [];
window.currentVerses = [];
window.currentIndex = 0;
window.currentMode = 'study';

// [회원가입/로그인 UI 제어]
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='block'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='block'; document.getElementById('signup-card').style.display='none'; };
window.togglePw = (id) => { const el = document.getElementById(id); el.type = el.type === 'password' ? 'text' : 'password'; };

// [인증 상태 감시 및 사이드바 동기화]
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'flex';
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('user-display').innerText = `${userData.nickname}님`;
            
            // 사용자가 선택한 코스들로 셀렉트 박스 채우기
            updateDataSelector(userData.selectedCourses);
            loadData(userData.selectedCourses[0]); // 첫 번째 코스 자동 로드
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

// [사이드바 메뉴 채우기]
function updateDataSelector(courses) {
    const selector = document.getElementById('data-selector');
    selector.innerHTML = '';
    courses.forEach(file => {
        const opt = document.createElement('option');
        opt.value = file;
        opt.innerText = file.replace('.json', '').toUpperCase();
        selector.appendChild(opt);
    });
}

// [데이터 로드 및 파트 버튼 생성]
window.loadData = async (fileName) => {
    try {
        const response = await fetch(`data/${fileName}`);
        window.allVerses = await response.json();
        generatePartButtons();
        filterPart(window.allVerses[0].p); // 첫 파트 자동 선택
    } catch (e) { console.error("데이터 로드 실패", e); }
};

function generatePartButtons() {
    const container = document.getElementById('part-container');
    const parts = [...new Set(window.allVerses.map(v => v.p))];
    container.innerHTML = '';
    parts.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.innerText = p;
        btn.onclick = () => filterPart(p);
        container.appendChild(btn);
    });
}

window.filterPart = (part) => {
    window.currentVerses = window.allVerses.filter(v => v.p === part);
    window.currentIndex = 0;
    updateCard();
};

window.updateCard = () => {
    const v = window.currentVerses[window.currentIndex];
    if(!v) return;
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    document.getElementById('v-content').style.display = (window.currentMode === 'study') ? 'none' : 'none'; // 기본 숨김
    document.getElementById('v-page').innerText = `${window.currentIndex + 1} / ${window.currentVerses.length}`;
};

window.handleCardClick = () => {
    const content = document.getElementById('v-content');
    content.style.display = (content.style.display === 'block') ? 'none' : 'block';
};

window.handleNext = () => { if (window.currentIndex < window.currentVerses.length - 1) { window.currentIndex++; updateCard(); } };
window.prevVerse = () => { if(window.currentIndex > 0) { window.currentIndex--; updateCard(); } };

// [로그아웃/로그인 함수]
window.handleLogout = () => signOut(auth);
window.handleLogin = () => {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;
    signInWithEmailAndPassword(auth, email, pw).catch(err => alert(err.message));
};