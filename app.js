import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAPuQQcX0mT1fqAa97CPPbhTy9GWdG8_J0",
    authDomain: "bible-memory-app-4e246.firebaseapp.com",
    projectId: "bible-memory-app-4e246",
    storageBucket: "bible-memory-app-4e246.firebasestorage.app",
    messagingSenderId: "112274931775",
    appId: "1:112274931775:web:e63478c296f7a702d6f88a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 전역 상태
window.allVerses = [];
window.currentVerses = [];
window.currentIndex = 0;
window.currentMode = 'practice';

// [1] 인증 상태 감시 (로그인 여부에 따라 화면 전환)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 로그인 성공 시
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const userData = docSnap.data();
            document.getElementById('user-display').innerText = `${userData.nickname}님 환영합니다!`;
            
            // 사용자가 가입 시 선택한 코스들만 셀렉트 박스에 노출
            const selector = document.getElementById('data-select');
            selector.innerHTML = userData.selectedCourses.map(file => {
                let name = file.split('_')[0].toUpperCase();
                return `<option value="${file}">${name} 과정</option>`;
            }).join('');
            
            loadData(userData.selectedCourses[0]); // 첫 번째 코스 자동 로드
        }
    } else {
        // 로그아웃 상태 시 로그인 화면 노출
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

// [2] 데이터 로드 공통 함수
window.loadData = async (fileName) => {
    const response = await fetch('data/' + fileName);
    window.allVerses = await response.json();
    if(typeof generatePartButtons === 'function') generatePartButtons();
    if(window.currentMode === 'practice') filterPart('A');
};

// [3] 로그인 / 회원가입 기능
window.handleLogin = () => {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;
    signInWithEmailAndPassword(auth, email, pw).catch(err => alert("로그인 실패: " + err.message));
};

window.handleSignUpFinal = async () => {
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const nick = document.getElementById('reg-nickname').value;
    const courses = Array.from(document.querySelectorAll('input[name="course"]:checked')).map(cb => cb.value);

    if(!email || !pw || !nick || courses.length === 0) { alert("정보를 모두 입력해주세요."); return; }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await setDoc(doc(db, "users", cred.user.uid), { 
            nickname: nick, 
            selectedCourses: courses,
            joinDate: new Date()
        });
        alert("가입 성공! 로그인해주세요.");
        closeSignupModal();
    } catch (e) { alert("가입 실패: " + e.message); }
};

window.handleLogout = () => signOut(auth);

// [4] UI 유틸리티
window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    side.classList.toggle('open');
    over.style.display = side.classList.contains('open') ? 'block' : 'none';
};
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='block'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='block'; document.getElementById('signup-card').style.display='none'; };

window.setMode = (mode) => {
    window.currentMode = mode;
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
};

window.updateCardUI = (v) => {
    const idEl = document.getElementById('v-id');
    const themeEl = document.getElementById('v-theme');
    idEl.innerText = v.id;
    themeEl.innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    idEl.style.display = window.currentMode === 'test' ? 'none' : 'block';
    themeEl.style.display = window.currentMode === 'test' ? 'none' : 'block';
    document.getElementById('v-content').style.display = 'none';
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('score-text').style.display = 'none';
};