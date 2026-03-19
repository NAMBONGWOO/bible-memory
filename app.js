import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

window.isNickValid = false; 

// [실시간 비밀번호 일치 체크]
document.addEventListener('input', (e) => {
    if (e.target.id === 'reg-pw' || e.target.id === 'reg-pw-confirm') {
        const pw = document.getElementById('reg-pw').value;
        const confirm = document.getElementById('reg-pw-confirm').value;
        const msg = document.getElementById('pw-match-msg');
        if (!confirm) msg.innerText = "";
        else if (pw === confirm) { msg.innerText = "✓ 비밀번호가 일치합니다."; msg.style.color = "green"; }
        else { msg.innerText = "✕ 비밀번호가 일치하지 않습니다."; msg.style.color = "red"; }
    }
});

// [실시간 닉네임 중복 체크]
document.addEventListener('input', async (e) => {
    if (e.target.id === 'reg-nickname') {
        const nick = e.target.value.trim();
        const msg = document.getElementById('nick-match-msg');
        if (nick.length < 2) { msg.innerText = "2자 이상 입력하세요."; msg.style.color = "#888"; return; }
        
        const q = query(collection(db, "users"), where("nickname", "==", nick));
        const snap = await getDocs(q);
        if (!snap.empty) { msg.innerText = "✕ 이미 사용 중인 닉네임입니다."; msg.style.color = "red"; window.isNickValid = false; }
        else { msg.innerText = "✓ 사용 가능한 닉네임입니다."; msg.style.color = "green"; window.isNickValid = true; }
    }
});

window.handleSignUpFinal = async () => {
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const confirm = document.getElementById('reg-pw-confirm').value;
    const nick = document.getElementById('reg-nickname').value.trim();
    const courses = Array.from(document.querySelectorAll('input[name="course"]:checked')).map(cb => cb.value);

    if(!email || !pw || !nick || courses.length === 0) { alert("정보를 모두 입력해주세요."); return; }
    if(pw !== confirm) { alert("비밀번호가 일치하지 않습니다."); return; }
    if(!window.isNickValid) { alert("닉네임을 확인해주세요."); return; }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await setDoc(doc(db, "users", cred.user.uid), { nickname: nick, selectedCourses: courses });
        alert("가입 성공! 로그인해 주세요.");
        location.reload();
    } catch (e) { alert(e.message); }
};

window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pw').value).catch(e => alert(e.message));
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('user-display').innerText = `${data.nickname}님`;
            const sel = document.getElementById('data-select');
            sel.innerHTML = data.selectedCourses.map(c => `<option value="${c}">${c}</option>`).join('');
            loadData(data.selectedCourses[0]);
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

window.loadData = async (f) => { const res = await fetch(`data/${f}`); window.allVerses = await res.json(); generatePartButtons(); filterPart('A'); };
window.handleLogout = () => signOut(auth);
window.toggleMenu = () => { document.getElementById('sideMenu').classList.toggle('open'); };
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='flex'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='flex'; document.getElementById('signup-card').style.display='none'; };
window.updateCardUI = (v) => {
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    document.getElementById('v-content').style.display = 'none';
};