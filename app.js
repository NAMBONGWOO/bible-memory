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

window.allVerses = []; window.currentVerses = []; window.currentIndex = 0; window.currentMode = 'practice';

// [1] 인증 상태 감시
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const userData = docSnap.data();
            document.getElementById('user-display').innerText = `${userData.nickname}님 환영합니다!`;
            
            const selector = document.getElementById('data-select');
            if (userData.selectedCourses && userData.selectedCourses.length > 0) {
                selector.innerHTML = userData.selectedCourses.map(file => {
                    let label = file.replace('.json', '').replace('_', ' ').toUpperCase();
                    return `<option value="${file}">${label}</option>`;
                }).join('');
                loadData(userData.selectedCourses[0]);
            }
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

// [2] 데이터 로드
window.loadData = async (file) => {
    const res = await fetch(`data/${file}`);
    window.allVerses = await res.json();
    if(typeof generatePartButtons === 'function') generatePartButtons();
    filterPart('A');
};

// [3] 로그인/가입/로그아웃
window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pw').value).catch(e => alert(e.message));
};

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

window.handleLogout = () => signOut(auth);

// [4] UI 유틸
window.toggleMenu = () => {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('overlay').style.display = document.getElementById('sideMenu').classList.contains('open') ? 'block' : 'none';
};
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='flex'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='flex'; document.getElementById('signup-card').style.display='none'; };

window.updateCardUI = (v) => {
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    document.getElementById('v-content').style.display = 'none';
};