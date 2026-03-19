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
            
            // 1. 닉네임 표시 보강
            document.getElementById('user-display').innerText = `${data.nickname}님`;
            
            // 2. 사이드바 셀렉트 박스 동적 생성
            const sel = document.getElementById('data-select');
            if (data.selectedCourses && data.selectedCourses.length > 0) {
                sel.innerHTML = data.selectedCourses.map(f => {
                    let label = f.replace('.json','')
                                 .replace('series_180_s','시리즈 ')
                                 .replace('dep_242_p','DEP ')
                                 .replace('nav_60', '주제별 60');
                    return `<option value="${f}">${label}</option>`;
                }).join('');

                // 3. 로그인 즉시 첫 번째 코스 로드 실행
                await loadData(data.selectedCourses[0]);
            }
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

window.setMode = (mode) => {
    window.currentMode = mode;
    const isTest = (mode === 'test');
    
    document.getElementById('mode-title').innerText = isTest ? '암송 테스트 (시험)' : '암송 카드 (연습)';
    
    // UI 요소 가시성 제어
    document.getElementById('test-setup').style.display = isTest ? 'block' : 'none';
    document.getElementById('practice-area').style.display = isTest ? 'none' : 'block';
    document.getElementById('practice-controls').style.display = isTest ? 'none' : 'flex';
    document.getElementById('test-controls').style.display = 'none';
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('status-panel').style.display = 'none';
    document.getElementById('part-container').style.display = isTest ? 'none' : 'flex';

    if (!isTest) {
        // 연습 모드로 돌아올 때 현재 선택된 파일 다시 로드
        const currentFile = document.getElementById('data-select').value;
        if(currentFile) loadData(currentFile);
    }
};

window.loadData = async (f) => {
    try {
        const res = await fetch(`data/${f}`);
        window.allVerses = await res.json();
        
        // 데이터 로드 후 파트 버튼 생성 및 첫 파트 필터링 실행
        if(window.generatePartButtons) window.generatePartButtons();
        
        if(window.allVerses && window.allVerses.length > 0) {
            const firstPart = window.allVerses[0].p;
            if(window.filterPart) window.filterPart(firstPart);
        }
    } catch (e) {
        console.error("데이터 로드 중 오류:", e);
    }
};

window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    side.classList.toggle('open');
    if (over) over.style.display = side.classList.contains('open') ? 'block' : 'none';
};