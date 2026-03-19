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

window.allVerses = [];
window.currentVerses = [];
window.currentIndex = 0;

// [UI 제어 함수]
window.openSignupModal = () => {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('signup-card').style.display = 'block';
};

window.closeSignupModal = () => {
    document.getElementById('login-card').style.display = 'block';
    document.getElementById('signup-card').style.display = 'none';
};

window.togglePw = (id) => {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
};

// [닉네임 실시간 중복 체크]
let nickTimer;
window.checkNickname = (val) => {
    clearTimeout(nickTimer);
    const msgEl = document.getElementById('nick-check-msg');
    if (!val) { msgEl.innerText = ""; return; }
    
    nickTimer = setTimeout(async () => {
        msgEl.innerText = "검사 중...";
        msgEl.style.color = "gray";
        try {
            const q = query(collection(db, "users"), where("nickname", "==", val));
            const snap = await getDocs(q);
            if(!snap.empty) {
                msgEl.innerText = "이미 사용 중인 닉네임입니다";
                msgEl.style.color = "red";
            } else {
                msgEl.innerText = "사용 가능";
                msgEl.style.color = "green";
            }
        } catch (e) {
            msgEl.innerText = "확인 불가";
        }
    }, 500);
};

// [가입 및 로그인 처리]
window.handleSignUpFinal = async () => {
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const pwConfirm = document.getElementById('reg-pw-confirm').value;
    const nickname = document.getElementById('reg-nickname').value;
    const selectedCourses = [];
    document.querySelectorAll('input[name="course"]:checked').forEach(cb => selectedCourses.push(cb.value));

    if(!email.includes('@')) { alert("이메일 형식을 확인해주세요."); return; }
    if(pw.length < 6) { alert("비밀번호는 6자 이상이어야 합니다."); return; }
    if(pw !== pwConfirm) { alert("비밀번호 확인이 일치하지 않습니다."); return; }
    if(!nickname) { alert("닉네임을 입력해주세요."); return; }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
            nickname: nickname,
            selectedCourses: selectedCourses,
            useOyo: true,
            joinDate: new Date(),
            completedVerses: []
        });
        alert("회원가입 성공!");
    } catch (err) {
        alert("가입 실패: " + err.message);
    }
};

window.handleLogin = () => {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;
    signInWithEmailAndPassword(auth, email, pw).catch(err => alert("로그인 실패: " + err.message));
};

window.handleLogout = () => signOut(auth);

// [상태 감시]
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'flex';
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            document.getElementById('user-display').innerText = `${userDoc.data().nickname}님 환영합니다!`;
        }
        initApp();
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

// [메인 로직]
async function initApp() { loadData('nav_60.json'); }

window.loadData = async (fileName) => {
    const response = await fetch('data/' + fileName);
    window.allVerses = await response.json();
    generatePartButtons();
    filterPart('A'); 
};

window.updateCard = () => {
    const v = window.currentVerses[window.currentIndex];
    if(!v) return;
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    document.getElementById('v-content').style.display = 'none';
    document.getElementById('v-page').innerText = `${window.currentIndex + 1} / ${window.currentVerses.length}`;
};

function generatePartButtons() {
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
};

window.handleCardClick = () => {
    const content = document.getElementById('v-content');
    content.style.display = (content.style.display === 'block') ? 'none' : 'block';
};

window.handleNext = () => { if (window.currentIndex < window.currentVerses.length - 1) { window.currentIndex++; updateCard(); } };
window.prevVerse = () => { if(window.currentIndex > 0) { window.currentIndex--; updateCard(); } };