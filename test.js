let testSessionVerses = [];
let testCurrentStep = 0;
let testTotalPenalty = 0;
let isCurrentChecked = false;

// 체크박스 생성
function generatePartCheckboxes() {
    const container = document.getElementById('part-selector-list');
    const parts = [...new Set(allVerses.map(v => v.p))];
    container.innerHTML = '';
    parts.forEach(p => {
        const label = document.createElement('label');
        label.className = 'part-option';
        label.innerHTML = `<input type="checkbox" name="test-part" value="${p}" checked> ${p} 파트 전체`;
        container.appendChild(label);
    });
}

// 세션 시작
function startTestSession() {
    const selectedParts = Array.from(document.querySelectorAll('input[name="test-part"]:checked')).map(cb => cb.value);
    if(selectedParts.length === 0) { alert("주제를 선택하세요."); return; }

    const filteredPool = allVerses.filter(v => selectedParts.includes(v.p));
    const countInput = parseInt(document.getElementById('test-count-input').value) || 10;
    const finalCount = Math.min(countInput, filteredPool.length);

    testSessionVerses = [...filteredPool].sort(() => Math.random() - 0.5).slice(0, finalCount);
    testCurrentStep = 0; testTotalPenalty = 0; isCurrentChecked = false;
    currentVerses = testSessionVerses; currentIndex = 0;

    document.getElementById('test-setup').style.display = 'none';
    document.getElementById('test-section').style.display = 'block';
    document.getElementById('check-btn').style.display = 'block';
    document.getElementById('status-panel').style.display = 'flex';
    updateCard(); updateStatus();
}

function updateStatus() {
    document.getElementById('test-progress').innerText = `진행: ${testCurrentStep + 1} / ${currentVerses.length}`;
    document.getElementById('test-total-score').innerText = `누적 감점: ${testTotalPenalty}`;
}

// 채점 로직
function runCheck() {
    if(isCurrentChecked) return;
    const v = currentVerses[currentIndex];
    const themeIn = document.getElementById('input-theme').value.trim();
    const contentIn = document.getElementById('input-content').value.trim();
    const clean = (t) => t.replace(/[.,·?!"'()]/g, "").replace(/\s/g, "");
    const origWords = v.content.split(/\s+/);
    const inWords = contentIn.split(/\s+/);

    let penalty = 0; let resHTML = "";
    if(clean(themeIn) !== clean(v.theme)) penalty += 1;
    
    const maxL = Math.max(origWords.length, inWords.length);
    for(let i = 0; i < maxL; i++) {
        const tar = origWords[i] || ""; const inp = inWords[i] || "";
        if (tar !== "" && clean(tar) === clean(inp)) resHTML += tar + " ";
        else { penalty += 1; resHTML += `<span class="wrong">${inp || "___"}</span> `; }
    }
    
    const curP = Math.min(penalty, 5);
    testTotalPenalty += curP; isCurrentChecked = true;
    document.getElementById('score-text').innerText = (curP === 0 ? "0" : "-" + curP);
    document.getElementById('score-text').style.display = 'block';
    document.getElementById('result-view').innerHTML = `<strong>정답 확인</strong><br>제목: ${v.theme}<br><br><strong>채점:</strong><br>${resHTML}<br><br><strong>원문:</strong><br>${v.content}`;
    document.getElementById('result-view').style.display = 'block';
    updateStatus();
}

function nextTestVerse() {
    if(!isCurrentChecked && !confirm("채점 없이 넘어갈까요?")) return;
    if(testCurrentStep < currentVerses.length - 1) {
        testCurrentStep++; currentIndex = testCurrentStep;
        isCurrentChecked = false; updateCard(); updateStatus();
    } else {
        alert(`테스트 완료! 누적 감점: ${testTotalPenalty}`);
        setMode('practice');
    }
}