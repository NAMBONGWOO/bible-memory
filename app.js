import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

window.currentMode = 'practice';

// ─── 로그인 상태 감지 → 화면 전환의 단일 진입점 ─────────────────────────
onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appContent = document.getElementById('app-content');

    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // ① 앱 화면 표시 (auth-screen 숨김)
                authScreen.style.display = 'none';
                appContent.style.display = 'block';

                const userData = docSnap.data();

                // ② 닉네임 표시
                const userDisplay = document.getElementById('user-display');
                if (userDisplay) userDisplay.innerText = `${userData.nickname}님`;

                // ③ 사이드바 코스 선택창: config.json 기준으로 사용자 코스 필터링
                await populateDataSelect(userData.selectedCourses || []);

                // ④ 첫 번째 데이터 로드
                const sel = document.getElementById('data-select');
                if (sel && sel.value) {
                    await window.loadData(sel.value);
                }
            } else {
                alert('사용자 설정 데이터가 없습니다. 다시 가입하거나 DB를 확인해주세요.');
                await auth.signOut();
            }
        } catch (error) {
            console.error('Firestore Error:', error);
            if (error.code === 'permission-denied') {
                alert('서버 설정 반영 중입니다. 1분 뒤에 강력 새로고침(Ctrl+F5)을 해주세요.');
            }
        }
    } else {
        // 비로그인 → 인증 화면만 표시
        authScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

// ─── config.json 기반으로 사용자 코스를 select에 채우기 ─────────────────
async function populateDataSelect(selectedCourses) {
    const sel = document.getElementById('data-select');
    if (!sel) return;

    try {
        // config.json에서 전체 코스 목록과 이름을 가져옴
        const res = await fetch('data/config.json');
        const allCourses = await res.json();

        // 사용자가 선택한 코스만 필터링하여 config.json의 이름으로 표시
        const userCourses = allCourses.filter(c => selectedCourses.includes(c.file));

        if (userCourses.length === 0) {
            sel.innerHTML = '<option value="">코스 없음</option>';
            return;
        }

        sel.innerHTML = userCourses
            .map(c => `<option value="${c.file}">${c.name}</option>`)
            .join('');
    } catch (e) {
        // config.json 로드 실패 시 selectedCourses 파일명으로 표시 (fallback)
        console.warn('config.json 로드 실패, fallback 사용:', e);
        sel.innerHTML = selectedCourses
            .map(f => `<option value="${f}">${f.replace('.json', '')}</option>`)
            .join('');
    }
}

// ─── 모드 전환: 연습 ↔ 테스트 ────────────────────────────────────────────
window.setMode = (mode) => {
    window.currentMode = mode;
    const isTest = (mode === 'test');

    document.getElementById('mode-title').innerText = isTest ? '암송 테스트 (시험)' : '암송 카드 (연습)';

    document.getElementById('test-setup').style.display      = isTest ? 'block' : 'none';
    document.getElementById('practice-area').style.display   = isTest ? 'none'  : 'block';
    document.getElementById('practice-controls').style.display = isTest ? 'none' : 'flex';
    document.getElementById('test-controls').style.display   = 'none';
    document.getElementById('test-section').style.display    = 'none';
    document.getElementById('status-panel').style.display    = 'none';
    document.getElementById('part-container').style.display  = isTest ? 'none'  : 'flex';

    // 연습 모드로 돌아올 때 현재 데이터 다시 표시
    if (!isTest) {
        const currentFile = document.getElementById('data-select').value;
        if (currentFile) window.loadData(currentFile);
    }

    window.toggleMenu();
};

// ─── JSON 데이터 로드 ────────────────────────────────────────────────────
window.loadData = async (f) => {
    if (!f) return;
    try {
        const res = await fetch(`data/${f}`);
        window.allVerses = await res.json();

        if (window.generatePartButtons) window.generatePartButtons();

        if (window.allVerses && window.allVerses.length > 0) {
            const firstPart = window.allVerses[0].p;
            if (window.filterPart) {
                window.filterPart(firstPart);
            } else {
                window.verses = window.allVerses;
                window.currentIndex = 0;
                window.updateCardUI(window.verses[0]);
            }
        }
    } catch (e) {
        console.error('JSON 로드 실패:', e);
        alert(`데이터 파일을 불러올 수 없습니다: ${f}`);
    }
};

// ─── 사이드 메뉴 토글 ────────────────────────────────────────────────────
window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    if (!side || !over) return;
    const isOpen = side.classList.toggle('open');
    over.style.display = isOpen ? 'block' : 'none';
};
