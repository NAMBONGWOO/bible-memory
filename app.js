import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

window.currentMode = 'practice';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('user-display').innerText = `${data.nickname}님`;
            const sel = document.getElementById('data-select');
            sel.innerHTML = data.selectedCourses.map(f => {
                let label = f.replace('.json','').replace('series_180_s','시리즈 ').replace('dep_242_p','DEP ');
                return `<option value="${f}">${label}</option>`;
            }).join('');
            await loadData(data.selectedCourses[0]);
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

window.setMode = (mode) => {
    window.currentMode = mode;
    const isTest = (mode === 'test');
    
    // 타이틀 변경
    document.getElementById('mode-title').innerText = isTest ? '암송 테스트 (시험)' : '암송 카드 (연습)';
    
    // UI 요소 가시성 제어
    document.getElementById('test-setup').style.display = isTest ? 'block' : 'none';
    document.getElementById('practice-area').style.display = isTest ? 'none' : 'block';
    document.getElementById('practice-controls').style.display = isTest ? 'none' : 'flex';
    document.getElementById('test-controls').style.display = 'none'; // 시작 전엔 숨김
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('status-panel').style.display = 'none';
    document.getElementById('part-container').style.display = isTest ? 'none' : 'flex';

    if (!isTest) {
        // 연습 모드로 돌아올 때 데이터 원복
        loadData(document.getElementById('data-select').value);
    }
};
window.loadData = async (f) => {
    const res = await fetch(`data/${f}`);
    window.allVerses = await res.json();
    if(window.generatePartButtons) generatePartButtons();
    if(window.filterPart) filterPart(window.allVerses[0].p);
};

window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    side.classList.toggle('open');
    over.style.display = side.classList.contains('open') ? 'block' : 'none';
};