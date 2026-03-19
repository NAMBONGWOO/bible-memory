import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appContent = document.getElementById('app-content');
    if (user) {
        authScreen.style.display = 'none';
        appContent.style.display = 'block';
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // [수정] 닉네임 표시
            document.getElementById('user-display').innerText = `${data.nickname}님`;
            
            // [수정] 사이드바 셀렉트 박스 채우기
            const sel = document.getElementById('data-select');
            sel.innerHTML = data.selectedCourses.map(f => {
                let label = f.replace('.json','').replace('series_180_s','시리즈 ').replace('dep_242_p','DEP ');
                return `<option value="${f}">${label}</option>`;
            }).join('');
            
            // 데이터 로드
            loadData(data.selectedCourses[0]);
        }
    } else {
        authScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    side.classList.toggle('open');
    over.style.display = side.classList.contains('open') ? 'block' : 'none';
};

window.loadData = async (f) => {
    const res = await fetch(`data/${f}`);
    window.allVerses = await res.json();
    if(window.generatePartButtons) generatePartButtons();
    // 데이터 로드 즉시 첫 구절 표시
    if(window.filterPart) {
        filterPart(window.allVerses[0].p);
    } else {
        window.updateCardUI(window.allVerses[0]);
    }
};

window.updateCardUI = (v) => {
    if(!v) return;
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    const content = document.getElementById('v-content');
    content.innerText = v.content;
    content.style.display = 'none'; // 연습 모드 기본 숨김
};