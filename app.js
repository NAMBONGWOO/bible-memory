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
            sel.innerHTML = data.selectedCourses.map(file => {
                let label = file.replace('.json', '')
                                .replace('series_180_s', '시리즈 ')
                                .replace('dep_242_p', 'DEP ')
                                .replace('nav_60_en', '60구절 (EN)')
                                .replace('nav_60', '주제별 60');
                return `<option value="${file}">${label}</option>`;
            }).join('');
            loadData(data.selectedCourses[0]);
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

window.toggleMenu = () => {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const isOpen = sideMenu.classList.contains('open');
    
    if (isOpen) {
        sideMenu.classList.remove('open');
        overlay.style.display = 'none';
    } else {
        sideMenu.classList.add('open');
        overlay.style.display = 'block';
    }
};

window.loadData = async (f) => {
    const res = await fetch(`data/${f}`);
    window.allVerses = await res.json();
    if (window.generatePartButtons) generatePartButtons();
    const firstPart = window.allVerses[0].p;
    if (window.filterPart) filterPart(firstPart);
};