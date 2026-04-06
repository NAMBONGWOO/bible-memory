import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAPuQQcX0mT1fqAa97CPPbhTy9GWdG8_J0",
    authDomain: "bible-memory-app-4e246.firebaseapp.com",
    projectId: "bible-memory-app-4e246",
    storageBucket: "bible-memory-app-4e246.firebasestorage.app",
    messagingSenderId: "112274931775",
    appId: "1:112274931775:web:e63478c296f7a702d6f88a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

window.isNickValid = false;

// ─── 회원가입 폼 열 때 config.json에서 코스 목록 동적 로드 ─────────────────
async function loadCourseCheckboxes() {
    const container = document.getElementById('course-checkboxes');
    try {
        const res = await fetch('data/config.json');
        const courses = await res.json();
        container.innerHTML = courses.map((c, i) =>
            `<label>
                <input type="checkbox" name="course" value="${c.file}" ${i === 0 ? 'checked' : ''}>
                ${c.name}
            </label>`
        ).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:red; font-size:12px;">코스 목록을 불러올 수 없습니다.</p>';
        console.error('config.json 로드 실패:', e);
    }
}

// ─── 비밀번호 / 닉네임 실시간 검증 ─────────────────────────────────────────
document.addEventListener('input', async (e) => {
    if (e.target.id === 'reg-pw' || e.target.id === 'reg-pw-confirm') {
        const pw = document.getElementById('reg-pw').value;
        const confirm = document.getElementById('reg-pw-confirm').value;
        const msg = document.getElementById('pw-match-msg');
        if (!msg) return;
        if (pw === confirm && pw !== '') {
            msg.innerText = '✓ 비밀번호 일치';
            msg.style.color = 'green';
        } else {
            msg.innerText = pw.length > 0 ? '✕ 비밀번호 불일치' : '';
            msg.style.color = 'red';
        }
    }

    if (e.target.id === 'reg-nickname') {
        const nick = e.target.value.trim();
        const msg = document.getElementById('nick-match-msg');
        if (!msg) return;
        if (nick.length < 2) {
            msg.innerText = '2자 이상 입력하세요.';
            msg.style.color = '#888';
            window.isNickValid = false;
            return;
        }
        msg.innerText = '확인 중...';
        msg.style.color = '#888';
        try {
            const q = query(collection(db, 'users'), where('nickname', '==', nick));
            const snap = await getDocs(q);
            if (!snap.empty) {
                msg.innerText = '✕ 이미 사용 중인 닉네임';
                msg.style.color = 'red';
                window.isNickValid = false;
            } else {
                msg.innerText = '✓ 사용 가능한 닉네임';
                msg.style.color = 'green';
                window.isNickValid = true;
            }
        } catch (err) {
            msg.innerText = '확인 실패 - 다시 시도해주세요.';
            msg.style.color = 'red';
            window.isNickValid = false;
        }
    }
});

// ─── 로그인 ─────────────────────────────────────────────────────────────────
window.handleLogin = () => {
    const email = document.getElementById('login-email').value.trim();
    const pw = document.getElementById('login-pw').value;
    if (!email || !pw) { alert('이메일과 비밀번호를 입력해주세요.'); return; }
    signInWithEmailAndPassword(auth, email, pw)
        .catch(e => {
            const msg = e.code === 'auth/invalid-credential'
                ? '이메일 또는 비밀번호가 올바르지 않습니다.'
                : e.message;
            alert(msg);
        });
};

// ─── 회원가입 최종 처리 ─────────────────────────────────────────────────────
window.handleSignUpFinal = async () => {
    if (!window.isNickValid) { alert('닉네임 중복 확인이 필요합니다.'); return; }

    const email = document.getElementById('reg-email').value.trim();
    const pw = document.getElementById('reg-pw').value;
    const pwConfirm = document.getElementById('reg-pw-confirm').value;
    const nick = document.getElementById('reg-nickname').value.trim();
    const courses = Array.from(document.querySelectorAll('input[name="course"]:checked')).map(cb => cb.value);

    if (!email || !pw) { alert('이메일과 비밀번호를 입력해주세요.'); return; }
    if (pw !== pwConfirm) { alert('비밀번호가 일치하지 않습니다.'); return; }
    if (pw.length < 6) { alert('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (courses.length === 0) { alert('최소 한 개의 코스를 선택하세요.'); return; }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await setDoc(doc(db, 'users', cred.user.uid), {
            nickname: nick,
            selectedCourses: courses
        });
        // 가입 성공 → onAuthStateChanged가 자동으로 앱 화면으로 전환
    } catch (e) {
        const msg = e.code === 'auth/email-already-in-use'
            ? '이미 사용 중인 이메일입니다.'
            : e.message;
        alert(msg);
    }
};

// ─── 로그아웃 ────────────────────────────────────────────────────────────────
window.handleLogout = () => signOut(auth);

// ─── 화면 전환: 로그인 ↔ 회원가입 ─────────────────────────────────────────
window.openSignupModal = async () => {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('signup-card').style.display = 'block';
    await loadCourseCheckboxes();   // 열 때마다 최신 config.json 반영
};

window.closeSignupModal = () => {
    document.getElementById('signup-card').style.display = 'none';
    const loginCard = document.getElementById('login-card');
    loginCard.style.display = 'flex';
    loginCard.style.flexDirection = 'column';
    // 입력값 초기화
    ['reg-email','reg-pw','reg-pw-confirm','reg-nickname'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['pw-match-msg','nick-match-msg'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '';
    });
    window.isNickValid = false;
};
