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

window.allVerses = []; window.currentVerses = []; window.currentIndex = 0;

// UI 제어
window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    side.classList.toggle('open');
    over.style.display = side.classList.contains('open') ? 'block' : 'none';
};
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='block'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='block'; document.getElementById('signup-card').style.display='none'; };

// 인증
window.handleSignUpFinal = async () => {
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const nick = document.getElementById('reg-nickname').value;
    const courses = Array.from(document.querySelectorAll('input[name="course"]:checked')).map(cb => cb.value);
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await setDoc(doc(db, "users", cred.user.uid), { nickname: nick, selectedCourses: courses });
        alert("가입 성공!");
    } catch (e) { alert(e.message); }
};
window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pw').value).catch(e => alert(e.message));
};
window.handleLogout = () => signOut(auth);

// 상태 감시 및 데이터 로드
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('user-display').innerText = `${data.nickname}님 환영합니다!`;
            const sel = document.getElementById('data-select');
            sel.innerHTML = data.selectedCourses.map(c => `<option value="${c}">${c}</option>`).join('');
            loadData(data.selectedCourses[0]);
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

window.loadData = async (file) => {
    const res = await fetch(`data/${file}`);
    window.allVerses = await res.json();
    const parts = [...new Set(window.allVerses.map(v => v.p))];
    document.getElementById('part-container').innerHTML = parts.map(p => `<button class="part-btn" onclick="filterPart('${p}')">${p}파트</button>`).join('');
    filterPart(parts[0]);
};

window.filterPart = (p) => {
    window.currentVerses = window.allVerses.filter(v => v.p === p);
    window.currentIndex = 0; updateCard();
    document.querySelectorAll('.part-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.includes(p)));
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

window.handleCardClick = () => {
    const el = document.getElementById('v-content');
    el.style.display = el.style.display==='block' ? 'none' : 'block';
};
window.handleNext = () => { if(window.currentIndex < window.currentVerses.length-1) { window.currentIndex++; updateCard(); } };
window.prevVerse = () => { if(window.currentIndex > 0) { window.currentIndex--; updateCard(); } };