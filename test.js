let testSessionVerses = [];
let testCurrentStep = 0;
let testTotalPenalty = 0;
let testMaxSteps = 10;
let isCurrentChecked = false;

function startTestSession() {
    const countInput = document.getElementById('test-count-input').value;
    testMaxSteps = Math.min(parseInt(countInput) || 10, allVerses.length);
    document.getElementById('test-setup').style.display = 'none';
    document.getElementById('test-section').style.display = 'block';
    document.getElementById('check-btn').style.display = 'block';
    document.getElementById('status-panel').style.display = 'flex';
    testSessionVerses = [...allVerses].sort(() => Math.random() - 0.5).slice(0, testMaxSteps);
    testCurrentStep = 0;
    testTotalPenalty = 0;
    isCurrentChecked = false;
    currentVerses = testSessionVerses;
    currentIndex = 0;
    updateCard();
    updateStatus();
}

function updateStatus() {
    document.getElementById('test-progress').innerText = `진행: ${testCurrentStep + 1} / ${testMaxSteps}`;
    document.getElementById('test-total-score').innerText = `누적 감점: ${testTotalPenalty}`;
}

function handleNext() {
    if(currentMode === 'test') {
        if(!isCurrentChecked) {
            if(!confirm("채점하지 않고 다음 구절로 넘어가시겠습니까?")) return;
        }
        if(testCurrentStep < testMaxSteps - 1) {
            testCurrentStep++;
            currentIndex = testCurrentStep;
            isCurrentChecked = false;
            updateCard();
            updateStatus();
        } else {
            alert(`테스트 완료!\n총 ${testMaxSteps}구절 중 누적 감점: ${testTotalPenalty}\n연습 모드로 돌아갑니다.`);
            setMode('practice');
        }
    } else {
        if (currentIndex < currentVerses.length - 1) { currentIndex++; updateCard(); }
    }
}

function runCheck() {
    if(isCurrentChecked) return;
    const v = currentVerses[currentIndex];
    const themeInput = document.getElementById('input-theme').value.trim();
    const contentInput = document.getElementById('input-content').value.trim();
    const clean = (text) => text.replace(/[.,·?!"'()]/g, "").replace(/\s/g, "");
    
    const originalWords = v.content.split(/\s+/);
    const inputWords = contentInput.split(/\s+/);
    
    let penalty = 0;
    let resultHTML = "";
    
    if(clean(themeInput) !== clean(v.theme)) { penalty += 1; }
    
    const maxLength = Math.max(originalWords.length, inputWords.length);
    for(let i = 0; i < maxLength; i++) {
        const target = originalWords[i] || "";
        const input = inputWords[i] || "";
        if (target !== "" && clean(target) === clean(input)) {
            resultHTML += target + " ";
        } else {
            penalty += 1;
            resultHTML += `<span class="wrong">${input || "___"}</span> `;
        }
    }
    
    const currentPenalty = Math.min(penalty, 5);
    testTotalPenalty += currentPenalty;
    isCurrentChecked = true;
    
    const scoreEl = document.getElementById('score-text');
    scoreEl.innerText = (currentPenalty === 0 ? "0" : "-" + currentPenalty);
    scoreEl.style.display = 'block';
    
    const resultEl = document.getElementById('result-view');
    resultEl.innerHTML = `<strong>정답 확인 [${v.id}]</strong><br>제목: ${v.theme}<br><br><strong>채점 결과:</strong><br>${resultHTML}<br><br><strong>원문 본문:</strong><br>${v.content}`;
    resultEl.style.display = 'block';
    updateStatus();
}