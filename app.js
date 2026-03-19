import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('user-display').innerText = `${data.nickname}님`;
            
            // 데이터 세트 선택창 구성
            const sel = document.getElementById('data-select');
            sel.innerHTML = data.selectedCourses.map(file => {
                // 파일명을 보기 좋은 이름으로 변환
                let label = file.replace('.json', '').replace('deep_180_', 'Series ').replace('nav_60', '주제별 60').toUpperCase();
                return `<option value="${file}">${label}</option>`;
            }).join('');
            
            loadData(data.selectedCourses[0]);
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

window.loadData = async (f) => {
    const res = await fetch(`data/${f}`);
    window.allVerses = await res.json();
    if(typeof generatePartButtons === 'function') generatePartButtons();
    filterPart('Series 1'); // 심화 과정은 'A' 파트가 없을 수 있으므로 유연하게 대처 필요
};

window.toggleMenu = () => document.getElementById('sideMenu').classList.toggle('open');
window.openSignupModal = () => { document.getElementById('login-card').style.display='none'; document.getElementById('signup-card').style.display='flex'; };
window.closeSignupModal = () => { document.getElementById('login-card').style.display='flex'; document.getElementById('signup-card').style.display='none'; };

window.updateCardUI = (v) => {
    document.getElementById('v-id').innerText = v.id;
    document.getElementById('v-theme').innerText = v.theme;
    document.getElementById('v-ref').innerText = v.ref;
    document.getElementById('v-content').innerText = v.content;
    document.getElementById('v-content').style.display = 'none';
};