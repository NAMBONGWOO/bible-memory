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
            // 닉네임 및 사이드바 코스 채우기
            document.getElementById('user-display').innerText = `${data.nickname}님`;
            const sel = document.getElementById('data-select');
            sel.innerHTML = data.selectedCourses.map(f => {
                let label = f.replace('.json','').replace('series_180_s','시리즈 ').replace('dep_242_p','DEP ');
                return `<option value="${f}">${label}</option>`;
            }).join('');
            
            // 첫 번째 데이터 로드 및 UI 초기화
            await loadData(data.selectedCourses[0]);
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
    try {
        const res = await fetch(`data/${f}`);
        window.allVerses = await res.json();
        
        // 연습 모드 필터 버튼 생성
        if(window.generatePartButtons) generatePartButtons();
        
        // 파트 필터링 및 첫 구절 업데이트
        const firstPart = window.allVerses[0].p;
        if(window.filterPart) {
            window.filterPart(firstPart);
        } else {
            window.currentIndex = 0;
            window.updateCardUI(window.allVerses[0]);
        }
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
};

// [중요] 카드를 실제로 그리는 함수
window.updateCardUI = (v) => {
    if(!v) return;
    document.getElementById('v-id').innerText = v.id || "-";
    document.getElementById('v-theme').innerText = v.theme || "제목 없음";
    document.getElementById('v-ref').innerText = v.ref || "장절 정보 없음";
    const content = document.getElementById('v-content');
    content.innerText = v.content || "내용이 없습니다.";
    content.style.display = 'none'; // 연습 모드이므로 처음엔 숨김

    // 페이지 표시 업데이트
    const pageInfo = document.getElementById('v-page');
    if (window.verses && pageInfo) {
        pageInfo.innerText = `${window.currentIndex + 1} / ${window.verses.length}`;
    }
};