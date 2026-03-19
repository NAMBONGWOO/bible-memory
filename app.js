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
                // [파일명 변환기] 파일명을 읽기 쉬운 한글 메뉴명으로 바꿉니다.
                let label = file.replace('.json', '')
                                .replace('series_180_s', '심화 시리즈 ')
                                .replace('dep_242_p', 'DEP 파트 ')
                                .replace('nav_60_en', '60구절 (English)')
                                .replace('nav_60', '주제별 60구절');
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
    generatePartButtons();
    // 첫 파트 자동 필터 (I, A, Series 1 등 데이터의 첫 파트 자동 감지)
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