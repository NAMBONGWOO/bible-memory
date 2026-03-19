import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

window.isNickValid = false; // 기본값은 항상 false

// [실시간 비밀번호 체크]
document.addEventListener('input', (e) => {
    if (e.target.id === 'reg-pw' || e.target.id === 'reg-pw-confirm') {
        const pw = document.getElementById('reg-pw').value;
        const confirm = document.getElementById('reg-pw-confirm').value;
        const msg = document.getElementById('pw-match-msg');
        if (!confirm) msg.innerText = "";
        else if (pw === confirm) { msg.innerText = "✓ 비밀번호 일치"; msg.style.color = "green"; }
        else { msg.innerText = "✕ 비밀번호 불일치"; msg.style.color = "red"; }
    }
});

// [실시간 닉네임 중복 체크 보강]
document.addEventListener('input', async (e) => {
    if (e.target.id === 'reg-nickname') {
        const nick = e.target.value.trim();
        const msg = document.getElementById('nick-match-msg');
        
        if (nick.length < 2) { 
            msg.innerText = "2자 이상 입력하세요."; 
            msg.style.color = "#888"; 
            window.isNickValid = false; 
            return; 
        }

        // 체크 중임을 표시
        msg.innerText = "중복 확인 중...";
        msg.style.color = "#0ea5e9";

        try {
            const q = query(collection(db, "users"), where("nickname", "==", nick));
            const snap = await getDocs(q);
            
            if (!snap.empty) { 
                msg.innerText = "✕ 이미 사용 중인 닉네임입니다."; 
                msg.style.color = "red"; 
                window.isNickValid = false; 
            } else { 
                msg.innerText = "✓ 사용 가능한 닉네임입니다."; 
                msg.style.color = "green"; 
                window.isNickValid = true; 
            }
        } catch (err) {
            console.error(err);
            window.isNickValid = false;
        }
    }
});

window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pw').value)
        .catch(e => alert("로그인 실패: " + e.message));
};

window.handleSignUpFinal = async () => {
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const confirm = document.getElementById('reg-pw-confirm').value;
    const nick = document.getElementById('reg-nickname').value.trim();
    const courses = Array.from(document.querySelectorAll('input[name="course"]:checked')).map(cb => cb.value);

    if(!window.isNickValid) { alert("닉네임 중복 확인이 필요합니다."); return; }
    if(pw !== confirm) { alert("비밀번호가 일치하지 않습니다."); return; }
    if(courses.length === 0) { alert("코스를 선택해주세요."); return; }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await setDoc(doc(db, "users", cred.user.uid), { nickname: nick, selectedCourses: courses, joinDate: new Date() });
        alert("가입 성공!");
        location.reload();
    } catch (e) { alert("가입 에러: " + e.message); }
};

window.handleLogout = () => signOut(auth);