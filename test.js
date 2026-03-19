let testSessionVerses = [];
let testCurrentStep = 0;
let testTotalPenalty = 0;
let testMaxSteps = 10;
let isCurrentChecked = false;

// [1] 테스트 시작 설정
window.startTestSession = () => {
    const countInput = document.getElementById('test-count-input');
    const requestedCount = countInput ? parseInt(countInput.value) : 10;
    
    // 현재 로드된 전체 데이터(window.allVerses)에서 랜덤 추출
    if (!window.allVerses || window.allVerses.length === 0) {
        alert("데이터가 로드되지 않았습니다.");
        return;
    }

    testMaxSteps = Math.min(requestedCount || 10, window.allVerses.length);
    testSessionVerses = [...window.allVerses].sort(() => Math.random() - 0.5).slice(0, testMaxSteps);
    
    testCurrentStep = 0;
    testTotalPenalty = 0;
    isCurrentChecked = false;
    
    // 연습 모드 변수와 동기화
    window.verses = testSessionVerses;
    window.currentIndex = 0;

    // UI 전환
    document.getElementById('test-setup').style.display = 'none';
    document.getElementById('test-section').style.display = 'block';
    document.getElementById('status-panel').style.display = 'flex';
    
    updateStatus();
    window.updateCardUI(window.verses[window.currentIndex]);
};

// [2] 상태 표시 업데이트
function updateStatus() {
    const prog = document.getElementById('test-progress');
    const score = document.getElementById('test-total-score');
    if (prog) prog.innerText = `진행: ${testCurrentStep + 1} / ${testMaxSteps}`;
    if (score) score.innerText = `누적 감점: ${testTotalPenalty}`;
}

// [3] 상세 채점 로직 (기존 runCheck 복구)
window.runCheck = () => {
    if (isCurrentChecked) return;
    
    const v = window.verses[window.currentIndex];
    const themeInput = document.getElementById('test-theme-input').value.trim();
    const contentInput = document.getElementById('test-content-input').value.trim();
    
    const clean = (text) => text.replace(/[.,·?!"'()]/g, "").replace(/\s/g, "");
    
    const originalWords = v.content.split(/\s+/);
    const inputWords = contentInput.split(/\s+/);
    
    let penalty = 0;
    let resultHTML = "";
    
    // 제목 체크
    if (clean(themeInput) !== clean(v.theme)) { penalty += 1; }
    
    // 본문 단어별 체크
    const maxLength = Math.max(originalWords.length, inputWords.length);
    for (let i = 0; i < maxLength; i++) {
        const target = originalWords[i] || "";
        const input = inputWords[i] || "";
        
        if (target !== "" && clean(target) === clean(input)) {
            resultHTML += target + " ";
        } else {
            penalty += 1;
            resultHTML += `<span style="color:red; text-decoration:underline;">${input || "___"}</span> `;
        }
    }
    
    // 한 문제당 최대 감점 5점으로 제한
    const currentPenalty = Math.min(penalty, 5);
    testTotalPenalty += currentPenalty;
    isCurrentChecked = true;
    
    // 결과 표시
    const resultView = document.getElementById('test-result-view');
    resultView.innerHTML = `
        <div style="background:#fef2f2; padding:15px; border-radius:15px; border:1px solid #fee2e2; margin-top:15px; text-align:left;">
            <b style="color:#ef4444;">이번 문제 감점: ${currentPenalty}</b><br><br>
            <b>[정답 확인]</b><br>
            제목: ${v.theme}<br>
            내용: ${v.content}<br><br>
            <b>[내 입력 분석]</b><br>
            ${resultHTML}
        </div>
    `;
    resultView.style.display = 'block';
    updateStatus();
};

// [4] 다음 문제로 (연습 모드의 handleNext와 통합 제어)
window.testNext = () => {
    if (!isCurrentChecked) {
        if (!confirm("채점하지 않고 다음 구절로 넘어가시겠습니까?")) return;
    }
    
    if (testCurrentStep < testMaxSteps - 1) {
        testCurrentStep++;
        window.currentIndex = testCurrentStep;
        isCurrentChecked = false;
        
        // 입력창 및 결과창 초기화
        document.getElementById('test-theme-input').value = "";
        document.getElementById('test-content-input').value = "";
        document.getElementById('test-result-view').style.display = 'none';
        
        window.updateCardUI(window.verses[window.currentIndex]);
        updateStatus();
    } else {
        alert(`테스트 완료!\n총 ${testMaxSteps}구절 중 누적 감점: ${testTotalPenalty}\n연습 모드로 돌아갑니다.`);
        window.setMode('practice');
    }
};