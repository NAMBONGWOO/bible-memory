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
                // [파일명 변환기 - 간소화 버전]
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

window.loadData = async (f) => {
    const res = await fetch(`data/${f}`);
    window.allVerses = await res.json();
    if(typeof generatePartButtons === 'function') generatePartButtons();
    
    // 데이터의 첫 번째 파트 자동 필터링 (A, I, 시리즈 1 등 유연하게 대응)
    const firstPart = window.allVerses[0].p;
    filterPart(firstPart);
};

window.toggleMenu = () => document.getElementById('sideMenu').classList.toggle('open');
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='flex'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='flex'; document.getElementById('signup-card').style.display='none'; };

window.updateCardUI = (v) => {
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    document.getElementById('v-content').style.display = 'none';
};