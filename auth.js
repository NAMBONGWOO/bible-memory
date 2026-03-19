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

window.isNickValid = false;

// 실시간 체크 로직들 (비밀번호, 닉네임)
document.addEventListener('input', async (e) => {
    if (e.target.id === 'reg-pw' || e.target.id === 'reg-pw-confirm') {
        const pw = document.getElementById('reg-pw').value;
        const confirm = document.getElementById('reg-pw-confirm').value;
        const msg = document.getElementById('pw-match-msg');
        if (pw === confirm && pw !== "") { msg.innerText = "✓ 일치"; msg.style.color="green"; }
        else { msg.innerText = "✕ 불일치"; msg.style.color="red"; }
    }
    if (e.target.id === 'reg-nickname') {
        const nick = e.target.value.trim();
        const msg = document.getElementById('nick-match-msg');
        if (nick.length < 2) { window.isNickValid = false; return; }
        const q = query(collection(db, "users"), where("nickname", "==", nick));
        const snap = await getDocs(q);
        if (!snap.empty) { msg.innerText = "✕ 중복"; msg.style.color="red"; window.isNickValid = false; }
        else { msg.innerText = "✓ 가능"; msg.style.color="green"; window.isNickValid = true; }
    }
});

window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pw').value).catch(e => alert(e.message));
};

window.handleSignUpFinal = async () => {
    if(!window.isNickValid) { alert("닉네임을 확인하세요."); return; }
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const nick = document.getElementById('reg-nickname').value;
    const courses = Array.from(document.querySelectorAll('input[name="course"]:checked')).map(cb => cb.value);
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await setDoc(doc(db, "users", cred.user.uid), { nickname: nick, selectedCourses: courses });
        location.reload();
    } catch (e) { alert(e.message); }
};

window.handleLogout = () => signOut(auth);