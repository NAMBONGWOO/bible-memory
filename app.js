import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

                // ④ 마지막 위치(코스/파트/구절) 복원 — 없으면 첫 번째 코스로 시작
                window._lastPosition = {
                    courseFile: userData.lastCourseFile || null,
                    part:       userData.lastPart       || null,
                    verseId:    userData.lastVerseId     || null,
                };

                const sel = document.getElementById('data-select');
                const targetFile = (window._lastPosition.courseFile &&
                                     userData.selectedCourses?.includes(window._lastPosition.courseFile))
                    ? window._lastPosition.courseFile
                    : sel?.value;

                if (sel && targetFile) {
                    sel.value = targetFile;
                    window.syncDataSelects(targetFile);
                    await window.loadData(targetFile);
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
// [설정 연동] settings.js의 코스 관리 저장 후 즉시 갱신하기 위해 window로 노출
// [요청] 사이드메뉴 select + 카드 상단 quick select 두 곳 모두 채움
window.populateDataSelect = async function populateDataSelect(selectedCourses) {
    const sel      = document.getElementById('data-select');
    const quickSel = document.getElementById('quick-data-select');
    if (!sel) return;

    try {
        // config.json에서 전체 코스 목록과 이름을 가져옴
        const res = await fetch('data/config.json');
        const allCourses = await res.json();

        // 사용자가 선택한 코스만 필터링하여 config.json의 이름으로 표시
        const userCourses = allCourses.filter(c => selectedCourses.includes(c.file));

        if (userCourses.length === 0) {
            const emptyHTML = '<option value="">코스 없음</option>';
            sel.innerHTML = emptyHTML;
            if (quickSel) quickSel.innerHTML = emptyHTML;
            return;
        }

        const optionsHTML = userCourses
            .map(c => `<option value="${c.file}">${c.name}</option>`)
            .join('');

        sel.innerHTML = optionsHTML;
        if (quickSel) quickSel.innerHTML = optionsHTML;
    } catch (e) {
        // config.json 로드 실패 시 selectedCourses 파일명으로 표시 (fallback)
        console.warn('config.json 로드 실패, fallback 사용:', e);
        const fallbackHTML = selectedCourses
            .map(f => `<option value="${f}">${f.replace('.json', '')}</option>`)
            .join('');
        sel.innerHTML = fallbackHTML;
        if (quickSel) quickSel.innerHTML = fallbackHTML;
    }
};

// ─── 두 데이터셋 선택 UI(사이드메뉴/카드상단) 값 동기화 ─────────────────
window.syncDataSelects = (value) => {
    const sel      = document.getElementById('data-select');
    const quickSel = document.getElementById('quick-data-select');
    if (sel)      sel.value      = value;
    if (quickSel) quickSel.value = value;
};

// ─── 모드 전환: 연습 ↔ 테스트 ────────────────────────────────────────────
window.setMode = (mode) => {
    window.currentMode = mode;
    const isTest = (mode === 'test');

    document.getElementById('mode-title').innerText = isTest ? '암송 테스트' : '암송 연습';

    document.getElementById('test-setup').style.display      = isTest ? 'block' : 'none';
    document.getElementById('practice-area').style.display   = isTest ? 'none'  : 'block';
    document.getElementById('practice-controls').style.display = isTest ? 'none' : 'flex';
    document.getElementById('test-controls').style.display   = 'none';
    document.getElementById('test-section').style.display    = 'none';
    document.getElementById('status-panel').style.display    = 'none';
    document.getElementById('part-container').style.display  = isTest ? 'none'  : 'flex';

    const quickSel = document.getElementById('quick-data-select');
    if (quickSel) quickSel.style.display = isTest ? 'none' : 'block';

    // 연습 모드로 돌아올 때: 파트/구절은 그대로 유지하고 화면만 다시 표시
    // (코스 자체를 바꾼 적이 없다면 데이터 재로드 불필요 — 세션 중 위치 유지)
    if (!isTest) {
        if (window.verses && window.verses.length > 0 && window.currentIndex != null) {
            window.updateCardUI(window.verses[window.currentIndex]);
        } else {
            const currentFile = document.getElementById('data-select').value;
            if (currentFile) window.loadData(currentFile);
        }
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
            // [요청] 마지막으로 보던 코스와 일치하면 파트/구절 위치까지 복원
            const last = window._lastPosition;
            const isSameCourse = last && last.courseFile === f;

            let targetPart = window.allVerses[0].p;
            if (isSameCourse && last.part && window.allVerses.some(v => v.p === last.part)) {
                targetPart = last.part;
            }

            if (window.filterPart) {
                window.filterPart(targetPart);

                // 파트 내에서 저장된 구절 인덱스로 이동
                if (isSameCourse && last.verseId && window.verses) {
                    const idx = window.verses.findIndex(v => v.id === last.verseId);
                    if (idx >= 0) {
                        window.currentIndex = idx;
                        window.updateCardUI(window.verses[idx]);
                    }
                }
            } else {
                window.verses = window.allVerses;
                window.currentIndex = 0;
                window.updateCardUI(window.verses[0]);
            }

            // 복원은 1회만 적용 — 이후 이동은 사용자의 실제 탐색을 그대로 저장
            window._lastPosition = null;
        }
    } catch (e) {
        console.error('JSON 로드 실패:', e);
        alert(`데이터 파일을 불러올 수 없습니다: ${f}`);
    }
};

// ─── [요청] 연습 모드 마지막 위치 저장 (디바운스) ────────────────────────
// 매 카드 전환마다 즉시 쓰지 않고, 잠시 멈췄을 때 한 번만 Firestore에 반영
let _saveTimer = null;
window.saveLastPosition = (verse) => {
    if (!verse) return;
    const user = auth.currentUser;
    if (!user) return;

    const courseFile = document.getElementById('data-select')?.value;
    if (!courseFile) return;

    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                lastCourseFile: courseFile,
                lastPart: verse.p || '',
                lastVerseId: verse.id || '',
            });
        } catch (e) {
            console.warn('마지막 위치 저장 실패 (사용에는 영향 없음):', e);
        }
    }, 800);
};

// ─── 사이드 메뉴 토글 ────────────────────────────────────────────────────
window.toggleMenu = () => {
    const side = document.getElementById('sideMenu');
    const over = document.getElementById('overlay');
    if (!side || !over) return;
    const isOpen = side.classList.toggle('open');
    over.style.display = isOpen ? 'block' : 'none';
};
