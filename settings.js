// ─── 개인설정 모듈 ───────────────────────────────────────────────────────
import { auth, db } from './auth.js';
import {
    EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentUserData = null; // Firestore users/{uid} 캐시

// ─── 설정 화면 열기 ──────────────────────────────────────────────────────
window.openSettingsScreen = async () => {
    window.toggleMenu();
    document.getElementById('settings-screen').style.display = 'block';
    document.getElementById('app-main-view').style.display = 'none';

    await loadSettingsData();
};

window.closeSettingsScreen = () => {
    document.getElementById('settings-screen').style.display = 'none';
    document.getElementById('app-main-view').style.display = 'block';
};

// ─── 현재 사용자 데이터 로드 & 화면 채우기 ───────────────────────────────
async function loadSettingsData() {
    const user = auth.currentUser;
    if (!user) return;

    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (!docSnap.exists()) return;
    currentUserData = docSnap.data();

    document.getElementById('settings-nickname').innerText = currentUserData.nickname || '';
    document.getElementById('settings-email').innerText    = user.email || '';
    document.getElementById('settings-avatar').innerText   = (currentUserData.nickname || '?').charAt(0);

    // 코스 태그 표시
    await renderCourseTags(currentUserData.selectedCourses || []);

    // 글자 크기 현재 선택 표시
    const savedSize = localStorage.getItem('fontSizePref') || 'medium';
    applyFontSizeSelection(savedSize);
}

// [요청] 알약 태그 나열 대신 개수 요약만 표시 — 실제 변경은 코스 관리 모달에서
async function renderCourseTags(selectedCourses) {
    const sub = document.getElementById('settings-course-sub');
    if (!sub) return;
    try {
        const res = await fetch('data/config.json');
        const allCourses = await res.json();
        const userCourses = allCourses.filter(c => selectedCourses.includes(c.file));
        sub.innerText = userCourses.length > 0
            ? `${userCourses.length}개 코스 진행 중`
            : '선택된 코스가 없습니다';
    } catch (e) {
        sub.innerText = '코스 정보를 불러올 수 없습니다';
    }
}

// ─── 닉네임 변경 ─────────────────────────────────────────────────────────
window.openNicknameEdit = () => {
    document.getElementById('nickname-edit-input').value = currentUserData?.nickname || '';
    document.getElementById('nickname-edit-msg').innerText = '';
    document.getElementById('nickname-edit-overlay').style.display = 'flex';
};

window.closeNicknameEdit = () => {
    document.getElementById('nickname-edit-overlay').style.display = 'none';
};

window.saveNicknameEdit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const newNick = document.getElementById('nickname-edit-input').value.trim();
    const msg = document.getElementById('nickname-edit-msg');

    if (newNick.length < 2) {
        msg.innerText = '2자 이상 입력하세요.';
        msg.style.color = 'red';
        return;
    }
    if (newNick === currentUserData?.nickname) {
        window.closeNicknameEdit();
        return;
    }

    msg.innerText = '확인 중...';
    msg.style.color = '#888';

    try {
        // 중복 확인
        const q = query(collection(db, 'users'), where('nickname', '==', newNick));
        const snap = await getDocs(q);
        if (!snap.empty) {
            msg.innerText = '✕ 이미 사용 중인 닉네임입니다.';
            msg.style.color = 'red';
            return;
        }

        await updateDoc(doc(db, 'users', user.uid), { nickname: newNick });
        currentUserData.nickname = newNick;

        document.getElementById('settings-nickname').innerText = newNick;
        document.getElementById('settings-avatar').innerText   = newNick.charAt(0);
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.innerText = `${newNick}님`;

        window.closeNicknameEdit();
    } catch (e) {
        msg.innerText = '변경 실패. 다시 시도해주세요.';
        msg.style.color = 'red';
        console.error(e);
    }
};

// ─── 비밀번호 변경 (재인증 필요) ─────────────────────────────────────────
window.openPasswordEdit = () => {
    document.getElementById('pw-edit-current').value = '';
    document.getElementById('pw-edit-new').value = '';
    document.getElementById('pw-edit-confirm').value = '';
    document.getElementById('pw-edit-msg').innerText = '';
    document.getElementById('password-edit-overlay').style.display = 'flex';
};

window.closePasswordEdit = () => {
    document.getElementById('password-edit-overlay').style.display = 'none';
};

window.savePasswordEdit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const currentPw = document.getElementById('pw-edit-current').value;
    const newPw     = document.getElementById('pw-edit-new').value;
    const confirmPw = document.getElementById('pw-edit-confirm').value;
    const msg = document.getElementById('pw-edit-msg');

    if (!currentPw || !newPw) {
        msg.innerText = '모든 항목을 입력해주세요.';
        msg.style.color = 'red';
        return;
    }
    if (newPw.length < 6) {
        msg.innerText = '새 비밀번호는 6자 이상이어야 합니다.';
        msg.style.color = 'red';
        return;
    }
    if (newPw !== confirmPw) {
        msg.innerText = '새 비밀번호가 일치하지 않습니다.';
        msg.style.color = 'red';
        return;
    }

    msg.innerText = '변경 중...';
    msg.style.color = '#888';

    try {
        // Firebase는 최근 로그인 여부를 확인 → 재인증 먼저
        const credential = EmailAuthProvider.credential(user.email, currentPw);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPw);

        msg.innerText = '✓ 비밀번호가 변경되었습니다.';
        msg.style.color = 'green';
        setTimeout(() => window.closePasswordEdit(), 1500);
    } catch (e) {
        const errMsg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
            ? '현재 비밀번호가 올바르지 않습니다.'
            : '변경 실패. 다시 시도해주세요.';
        msg.innerText = errMsg;
        msg.style.color = 'red';
    }
};

// ─── 암송 코스 관리 (회원가입과 동일 - 체크박스 전체 재설정) ────────────
window.openCourseEdit = async () => {
    const container = document.getElementById('course-edit-checkboxes');
    container.innerHTML = '<p style="color:#888; font-size:13px; text-align:center;">불러오는 중...</p>';
    document.getElementById('course-edit-overlay').style.display = 'flex';

    try {
        const res = await fetch('data/config.json');
        const allCourses = await res.json();
        const selected = new Set(currentUserData?.selectedCourses || []);

        container.innerHTML = allCourses.map(c =>
            `<label>
                <input type="checkbox" name="course-edit" value="${c.file}" ${selected.has(c.file) ? 'checked' : ''}>
                ${c.name}
            </label>`
        ).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:red; font-size:13px;">코스 목록을 불러올 수 없습니다.</p>';
    }
};

window.closeCourseEdit = () => {
    document.getElementById('course-edit-overlay').style.display = 'none';
};

window.saveCourseEdit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const selected = Array.from(document.querySelectorAll('input[name="course-edit"]:checked')).map(cb => cb.value);
    if (selected.length === 0) {
        alert('최소 한 개의 코스를 선택하세요.');
        return;
    }

    try {
        await updateDoc(doc(db, 'users', user.uid), { selectedCourses: selected });
        currentUserData.selectedCourses = selected;

        await renderCourseTags(selected);

        // 사이드바 코스 선택 select 즉시 갱신 (app.js에 노출된 함수 재사용)
        if (window.populateDataSelect) {
            await window.populateDataSelect(selected);
        }

        window.closeCourseEdit();
        alert('코스가 업데이트되었습니다.');
    } catch (e) {
        alert('코스 저장에 실패했습니다. 다시 시도해주세요.');
        console.error(e);
    }
};

// ─── 글자 크기 설정 ──────────────────────────────────────────────────────
const FONT_SIZE_MAP = { small: '16px', medium: '19px', large: '23px' };

window.setFontSizePref = (size) => {
    localStorage.setItem('fontSizePref', size);
    applyFontSizeSelection(size);
    applyFontSizeToContent(size);
};

function applyFontSizeSelection(size) {
    document.querySelectorAll('.font-opt').forEach(el => {
        el.classList.toggle('selected', el.dataset.size === size);
    });
}

function applyFontSizeToContent(size) {
    const px = FONT_SIZE_MAP[size] || FONT_SIZE_MAP.medium;
    const vContent = document.getElementById('v-content');
    const testContentInput = document.getElementById('test-content-input');
    if (vContent) vContent.style.fontSize = px;
    if (testContentInput) testContentInput.style.fontSize = px;
}

// 앱 시작 시 저장된 글자 크기 즉시 적용
(function applySavedFontSizeOnLoad() {
    const saved = localStorage.getItem('fontSizePref') || 'medium';
    document.addEventListener('DOMContentLoaded', () => applyFontSizeToContent(saved));
})();

// ─── 로그아웃 (설정 화면에서도 접근) ─────────────────────────────────────
window.handleLogoutFromSettings = () => {
    window.closeSettingsScreen();
    window.handleLogout();
};

// ─── 계정 삭제 ───────────────────────────────────────────────────────────
window.openDeleteAccountConfirm = () => {
    document.getElementById('delete-confirm-input').value = '';
    document.getElementById('delete-confirm-msg').innerText = '';
    document.getElementById('delete-account-overlay').style.display = 'flex';
};

window.closeDeleteAccountConfirm = () => {
    document.getElementById('delete-account-overlay').style.display = 'none';
};

window.confirmDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const input = document.getElementById('delete-confirm-input').value.trim();
    const msg = document.getElementById('delete-confirm-msg');

    if (input !== '계정삭제') {
        msg.innerText = "'계정삭제'를 정확히 입력해주세요.";
        msg.style.color = 'red';
        return;
    }

    msg.innerText = '삭제 중...';
    msg.style.color = '#888';

    try {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(user);
        // deleteUser 성공 시 onAuthStateChanged가 자동으로 로그인 화면 전환
    } catch (e) {
        if (e.code === 'auth/requires-recent-login') {
            msg.innerText = '보안을 위해 재로그인이 필요합니다. 로그아웃 후 다시 로그인해서 시도해주세요.';
        } else {
            msg.innerText = '삭제 실패. 다시 시도해주세요.';
        }
        msg.style.color = 'red';
        console.error(e);
    }
};
