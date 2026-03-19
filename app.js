import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// --- [팝업 제어 함수] ---

window.openRegisterPopup = () => {
    console.log("회원가입 버튼 클릭됨");
    // 1단계 입력값이 비어있어도 일단 팝업을 띄웁니다.
    document.getElementById('auth-step-1').style.display = 'none';
    document.getElementById('auth-step-2').style.display = 'block';
};

window.closeRegisterPopup = () => {
    document.getElementById('auth-step-1').style.display = 'block';
    document.getElementById('auth-step-2').style.display = 'none';
};

// 최종 가입 완료 및 Firestore 데이터 저장 (체크박스 대응)
window.handleSignUpFinal = async () => {
    const email = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pw').value;
    const nickname = document.getElementById('reg-nickname').value;
    
    // 체크된 모든 코스 값을 배열(List)로 수집
    const selectedCourses = [];
    document.querySelectorAll('input[name="course"]:checked').forEach((checkbox) => {
        selectedCourses.push(checkbox.value);
    });

    // 유효성 검사
    if(!email || !email.includes('@')) { alert("로그인용 이메일을 정확히 입력해주세요."); return; }
    if(pw.length < 6) { alert("비밀번호를 6자 이상 입력해주세요."); return; }
    if(!nickname) { alert("닉네임을 입력해주세요."); return; }
    if(selectedCourses.length === 0) { alert("최소 하나 이상의 암송 코스를 선택해주세요."); return; }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
        const user = userCredential.user;

        // 구글 서버(Firestore)에 사용자 맞춤형 장부 생성
        await setDoc(doc(db, "users", user.uid), {
            nickname: nickname,
            selectedCourses: selectedCourses, // [ "BB01", "BA01" ] 형태로 저장됨
            useOyo: true, // OYO는 기본 활성화
            joinDate: new Date(),
            completedVerses: [] // 0점에서 시작
        });

        alert(`${nickname}님, 선택하신 코스로 암송 생활이 시작됩니다!`);
    } catch (err) {
        alert("가입 중 오류가 발생했습니다: " + err.message);
    }
};
        alert(`${nickname}님, 가입을 환영합니다!`);
    } catch (err) {
        alert("가입 실패: " + err.message);
    }
};

window.handleLogin = () => {
    const email = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pw').value;
    if(!email || !pw) { alert("이메일과 비밀번호를 입력하세요."); return; }
    signInWithEmailAndPassword(auth, email, pw).catch(err => alert("로그인 실패: " + err.message));
};

window.handleLogout = () => signOut(auth);

// 인증 상태 감시
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

async function initApp() { loadData('nav_60.json'); }

window.loadData = async (fileName) => {
    try {
        const response = await fetch('data/' + fileName);
        window.allVerses = await response.json();
        generatePartButtons();
        filterPart('A'); 
    } catch (e) { console.error("데이터 로드 실패", e); }
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