import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

window.currentMode = 'practice';

onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appContent = document.getElementById('app-content');

    if (user) {
        authScreen.style.display = 'none';
        appContent.style.display = 'block';

        try {
            // 1. Firestore에서 유저 문서 가져오기
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // 2. 닉네임 표시 (상단 및 사이드바)
                const userDisplay = document.getElementById('user-display');
                if (userDisplay) userDisplay.innerText = `${userData.nickname}님`;

                // 3. [핵심] 사이드바 셀렉트 박스 채우기
                const sel = document.getElementById('data-select');
                if (sel && userData.selectedCourses && userData.selectedCourses.length > 0) {
                    sel.innerHTML = userData.selectedCourses.map(file => {
                        // 파일명을 보기 좋게 변환
                        let label = file.replace('.json', '')
                                        .replace('series_180_s', '시리즈 ')
                                        .replace('dep_242_p', 'DEP ')
                                        .replace('nav_60', '주제별 60');
                        return `<option value="${file}">${label}</option>`;
                    }).join('');

                    // 4. 첫 번째 데이터 즉시 로드
                    await window.loadData(userData.selectedCourses[0]);
                } else {
                    console.warn("선택된 코스가 없습니다.");
                    if(sel) sel.innerHTML = '<option value="">선택된 코스 없음</option>';
                }
            }
        } catch (error) {
            console.error("유저 데이터 로드 중 에러:", error);
        }
    } else {
        authScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

// 모드 전환 함수
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
        const currentFile = document.getElementById('data-select').value;
        if(currentFile) window.loadData(currentFile);
    }
    // 햄버거 메뉴 닫기 방지 (사용자가 직접 닫게 하거나 원하시면 toggleMenu() 추가 가능)
};

// 데이터 로드 함수
window.loadData = async (f) => {
    if (!f) return;
    try {
        const res = await fetch(`data/${f}`);
        if (!res.ok) throw new Error("파일을 찾을 수 없습니다.");
        
        window.allVerses = await res.json();
        
        // 파트 버튼 생성
        if(window.generatePartButtons) window.generatePartButtons();
        
        // 첫 번째 파트로 자동 필터링
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
        console.error("데이터 로드 중 오류:", e);
    }
};

window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    if(!side || !over) return;
    side.classList.toggle('open');
    over.style.display = side.classList.contains('open') ? 'block' : 'none';
};