import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

window.currentMode = 'practice';

onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appContent = document.getElementById('app-content');

    if (user) {
        try {
            // Firestore에서 유저 데이터 가져오기
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // 로그인 성공 시 화면 전환
                authScreen.style.display = 'none';
                appContent.style.display = 'block';

                const userData = docSnap.data();
                
                // 1. 닉네임 표시
                const userDisplay = document.getElementById('user-display');
                if (userDisplay) userDisplay.innerText = `${userData.nickname}님`;

                // 2. 사이드바 코스 선택창 채우기
                const sel = document.getElementById('data-select');
                if (sel && userData.selectedCourses && userData.selectedCourses.length > 0) {
                    sel.innerHTML = userData.selectedCourses.map(f => {
                        let label = f.replace('.json','')
                                     .replace('series_180_s','시리즈 ')
                                     .replace('dep_242_p','DEP ')
                                     .replace('nav_60', '주제별 60');
                        return `<option value="${f}">${label}</option>`;
                    }).join('');

                    // 3. 첫 번째 데이터 로드
                    await window.loadData(userData.selectedCourses[0]);
                }
            } else {
                alert("사용자 설정 데이터가 없습니다. 다시 가입하거나 DB를 확인해주세요.");
            }
        } catch (error) {
            console.error("Firestore Error:", error);
            // API 활성화 직후라면 잠시 대기 후 새로고침 안내
            if (error.code === 'permission-denied') {
                alert("서버 설정 반영 중입니다. 1분 뒤에 강력 새로고침(Ctrl+F5)을 해주세요.");
            }
        }
    } else {
        authScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

// 모드 전환
window.setMode = (mode) => {
    window.currentMode = mode;
    const isTest = (mode === 'test');
    document.getElementById('mode-title').innerText = isTest ? '암송 테스트 (시험)' : '암송 카드 (연습)';
    
    document.getElementById('test-setup').style.display = isTest ? 'block' : 'none';
    document.getElementById('practice-area').style.display = isTest ? 'none' : 'block';
    document.getElementById('practice-controls').style.display = isTest ? 'none' : 'flex';
    document.getElementById('test-controls').style.display = 'none';
    document.getElementById('test-section').style.display = 'none';
    document.getElementById('status-panel').style.display = 'none';
    document.getElementById('part-container').style.display = isTest ? 'none' : 'flex';

    if (!isTest) {
        const currentFile = document.getElementById('data-select').value;
        if(currentFile) window.loadData(currentFile);
    }
    window.toggleMenu(); // 모드 선택 후 메뉴 닫기
};

// 데이터 로드
window.loadData = async (f) => {
    if (!f) return;
    try {
        const res = await fetch(`data/${f}`);
        window.allVerses = await res.json();
        
        if(window.generatePartButtons) window.generatePartButtons();
        
        if(window.allVerses && window.allVerses.length > 0) {
            const firstPart = window.allVerses[0].p;
            if(window.filterPart) window.filterPart(firstPart);
            else {
                window.verses = window.allVerses;
                window.currentIndex = 0;
                window.updateCardUI(window.verses[0]);
            }
        }
    } catch (e) {
        console.error("JSON 로드 실패:", e);
    }
};

// 햄버거 메뉴 토글
window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    if(!side || !over) return;
    const isOpen = side.classList.toggle('open');
    over.style.display = isOpen ? 'block' : 'none';
};