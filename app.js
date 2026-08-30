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
// [요청] 사이드메뉴 select + 카드 상단 quick select + 아이패드 사이드패널까지 모두 채움
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
            window._ipadCourseList = [];
            renderIpadCourseList();
            return;
        }

        const optionsHTML = userCourses
            .map(c => `<option value="${c.file}">${c.name}</option>`)
            .join('');

        sel.innerHTML = optionsHTML;
        if (quickSel) quickSel.innerHTML = optionsHTML;

        // [확정 스펙] 아이패드 좌측 사이드패널용 코스 목록 캐싱 후 렌더링
        window._ipadCourseList = userCourses;
        renderIpadCourseList();
    } catch (e) {
        // config.json 로드 실패 시 selectedCourses 파일명으로 표시 (fallback)
        console.warn('config.json 로드 실패, fallback 사용:', e);
        const fallbackHTML = selectedCourses
            .map(f => `<option value="${f}">${f.replace('.json', '')}</option>`)
            .join('');
        sel.innerHTML = fallbackHTML;
        if (quickSel) quickSel.innerHTML = fallbackHTML;
        window._ipadCourseList = selectedCourses.map(f => ({ file: f, name: f.replace('.json', '') }));
        renderIpadCourseList();
    }
};

// ─── [확정 스펙] 아이패드 사이드패널 — 코스 목록 렌더링 ─────────────────
function renderIpadCourseList() {
    const listEl = document.getElementById('ipad-course-list');
    if (!listEl) return;

    const courses = window._ipadCourseList || [];
    const currentFile = document.getElementById('data-select')?.value;

    listEl.innerHTML = courses.map(c => `
        <div class="ipad-course-item ${c.file === currentFile ? 'active' : ''}" onclick="selectIpadCourse('${c.file}')">
            ${c.name}
        </div>
    `).join('');
}

// ─── 사이드패널에서 코스 클릭 시 — 기존 loadData/select 동기화 로직 재사용 ─
window.selectIpadCourse = async (file) => {
    const sel = document.getElementById('data-select');
    if (sel) sel.value = file;
    window.syncDataSelects(file);
    await window.loadData(file);
    renderIpadCourseList();
};

// ─── [확정 스펙] 아이패드 사이드패널 — 파트 목록 렌더링 ─────────────────
// practice.js의 generatePartButtons가 호출될 때 함께 갱신됨 (아래 훅 참고)
window.renderIpadPartList = () => {
    const listEl  = document.getElementById('ipad-part-list');
    const titleEl = document.getElementById('ipad-part-title');
    if (!listEl || !titleEl) return;

    const parts = [...new Set((window.allVerses || []).map(v => v.p))];

    if (parts.length <= 1) {
        titleEl.style.display = 'none';
        listEl.innerHTML = '';
        return;
    }

    titleEl.style.display = 'block';
    listEl.innerHTML = parts.map(p => `
        <div class="ipad-part-item" onclick="filterPart('${p}'); renderIpadPartList();">
            ${p}
        </div>
    `).join('');

    // 현재 활성 파트 표시 동기화
    const activeBtn = document.querySelector('#part-container .part-btn.active');
    if (activeBtn) {
        listEl.querySelectorAll('.ipad-part-item').forEach(el => {
            el.classList.toggle('active', el.innerText.trim() === activeBtn.innerText.trim());
        });
    }
};

// ─── 두 데이터셋 선택 UI(사이드메뉴/카드상단) 값 동기화 ─────────────────
window.syncDataSelects = (value) => {
    const sel      = document.getElementById('data-select');
    const quickSel = document.getElementById('quick-data-select');
    if (sel)      sel.value      = value;
    if (quickSel) quickSel.value = value;
};

// ─── [변경] 헤더의 자동공개 토글 — practice/bilingual 모두 동일한 토글 사용 ─
window.toggleCurrentReveal = () => {
    if (window.toggleAutoReveal) window.toggleAutoReveal();
};

// ─── 모드 전환: 연습 / 테스트 / 연습2(한영) ──────────────────────────────
// [리팩터링] bilingual은 별도 화면이 아니라 practice와 같은 app-main-view를
// 그대로 사용한다. 카드 표시/슬라이드/화살표/토글 로직은 practice.js 그대로,
// 여기서는 초기화 시점에 bilingual.js의 데이터 준비 함수만 추가로 호출한다.
window.setMode = (mode) => {
    window.currentMode = mode;
    const isTest      = (mode === 'test');
    const isBilingual = (mode === 'bilingual');
    const isPracticeLike = !isTest; // practice, bilingual 모두 같은 카드뷰 사용

    const titles = { practice: '암송 연습', test: '암송 테스트', bilingual: '암송 연습 2 (한/영)' };
    document.getElementById('mode-title').innerText = titles[mode] || '암송 연습';

    document.getElementById('test-setup').style.display      = isTest ? 'block' : 'none';
    document.getElementById('practice-area').style.display   = isTest ? 'none'  : 'block';
    document.getElementById('practice-controls').style.display = isTest ? 'none' : 'flex';
    document.getElementById('test-controls').style.display   = 'none';
    document.getElementById('test-section').style.display    = 'none';
    document.getElementById('status-panel').style.display    = 'none';
    document.getElementById('part-scroll-wrap').style.display  = isTest ? 'none'  : 'block';

    // [버그 수정] test-setup(코스 선택 화면)이 열릴 때, 카드 상단에 고정된
    // v-ref(장절)·v-id(분류코드)가 practice-area 밖에 있어서 안 숨겨지고
    // 이전 연습 카드 내용이 그대로 비치던 문제 — 코스선택 중에는 함께 숨김
    const vRef = document.getElementById('v-ref');
    const vId  = document.getElementById('v-id');
    if (vRef) vRef.style.display = isTest ? 'none' : 'block';
    if (vId)  vId.style.display  = isTest ? 'none' : 'block';

    // [요청] 테스트 설정 화면 진입 시 파트/범위 선택 UI 갱신
    if (isTest && window.populateTestPartSelect) {
        window.populateTestPartSelect();
    }

    const quickSel = document.getElementById('quick-data-select');
    if (quickSel) quickSel.style.display = isPracticeLike ? 'block' : 'none';

    // 자동 공개 토글은 연습1/연습2에서 보이고, 테스트에서는 숨김
    const autoRevealToggle = document.getElementById('auto-reveal-toggle');
    if (autoRevealToggle) {
        autoRevealToggle.style.visibility = isTest ? 'hidden' : 'visible';
        autoRevealToggle.classList.toggle('on', window.autoRevealOn);
    }

    // [버그 수정] 테스트 모드에서는 채점 결과가 길어질 수 있으므로
    // 카드 내부 정렬을 상단(flex-start)으로 바꿔 스크롤이 자연스럽게 시작되도록 함
    const mainCard = document.getElementById('main-card');
    if (mainCard) mainCard.style.justifyContent = isTest ? 'flex-start' : 'center';

    if (isPracticeLike) {
        // 세션 중 이미 로드된 데이터가 있으면 그대로 재사용, 없으면 새로 로드
        if (window.verses && window.verses.length > 0 && window.currentIndex != null) {
            window.updateCardUI(window.verses[window.currentIndex]);
        } else {
            const currentFile = document.getElementById('data-select').value;
            if (currentFile) window.loadData(currentFile);
        }
    }

    // [요청] 암송연습2 진입 시 — 짝 언어(en) 데이터 준비
    if (isBilingual && window.initBilingualMode) {
        window.initBilingualMode();
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

    // [요청] 암송연습2 모드에서 코스를 바꾸면 영어 짝 데이터도 함께 갱신
    if (window.currentMode === 'bilingual' && window.syncBilingualPair) {
        window.syncBilingualPair(f);
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

    // [버그 수정] 사이드메뉴 안의 select(data-select) 등이 포커스를 유지한 채
    // 메뉴가 닫히면, 나중에 화면 다른 곳(특히 연습장)에서 손이 닿았을 때
    // iOS가 그 남은 포커스 위치(메뉴가 있던 좌상단)에 붙여넣기 팝업을 띄우는
    // 현상이 있었다. 메뉴를 닫을 때 내부의 모든 포커스 가능한 요소에서
    // 명시적으로 포커스를 제거해 이 잔여 상태를 없앤다.
    if (!isOpen) {
        side.querySelectorAll('select, input, textarea, button').forEach(el => el.blur());
        // 활성 요소가 메뉴 안에 남아있다면 body로 포커스를 되돌림
        if (side.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    }
};
