import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

window.loadData = async (f) => {
    const res = await fetch(`data/${f}`);
    window.allVerses = await res.json();
    generatePartButtons();
    filterPart('A');
};

window.toggleMenu = () => document.getElementById('sideMenu').classList.toggle('open');
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='flex'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='flex'; document.getElementById('signup-card').style.display='none'; };