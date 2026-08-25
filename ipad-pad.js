// ─── [버그 수정] 아이패드 연습장 — 캔버스 기반 순수 필기 (텍스트 자동변환 없음) ─
// Apple Pencil/손가락/마우스 궤적을 그대로 그림으로 남긴다.
// textarea를 쓰면 Scribble 기능이 손글씨를 텍스트로 바꿔버리므로,
// canvas + Pointer Events로 순수 드로잉만 구현한다.
//
// [원인] 기존엔 setTimeout(1000ms) 재시도 루프로 캔버스에 리스너를 붙였는데,
// 앱을 열자마자(1~2초 이내) 바로 펜슬로 캔버스를 터치하면 그 찰나에 아직
// 리스너가 안 붙어있어 iOS가 기본 동작(Scribble 텍스트 변환)으로 처리해버림.
// → MutationObserver로 캔버스가 DOM에 나타나는 즉시 리스너를 붙이고,
//   pointerdown에서 preventDefault()로 브라우저 기본 제스처 인식 자체를 차단.

(function initIpadPad() {
    let canvas, ctx;
    let drawing = false;
    let lastX = 0, lastY = 0;

    function getCanvas() {
        return document.getElementById('ipad-pad-canvas');
    }

    // 캔버스 실제 픽셀 해상도를 표시 크기에 맞춰 선명하게 설정
    // (리사이즈/레이아웃 전환 시 다시 불러도 그림이 남아있도록 백업 후 복원)
    function resizeCanvasKeepingContent() {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // 기존 내용을 임시 캔버스에 백업
        const backup = document.createElement('canvas');
        backup.width = canvas.width;
        backup.height = canvas.height;
        const hadContent = canvas.width > 0 && canvas.height > 0;
        if (hadContent) backup.getContext('2d').drawImage(canvas, 0, 0);

        canvas.width  = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.2;

        // 백업된 내용 복원 (크기 변화에 맞춰 확대/축소)
        if (hadContent) {
            ctx.drawImage(backup, 0, 0, backup.width, backup.height, 0, 0, rect.width, rect.height);
        }
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function start(e) {
        e.preventDefault(); // [버그 수정] 브라우저의 기본 제스처 인식(Scribble 포함) 차단
        drawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function move(e) {
        if (!drawing || !ctx) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    }

    function end(e) {
        if (e) e.preventDefault();
        drawing = false;
    }

    // ─── 지우기 버튼 ─────────────────────────────────────────────────────
    window.clearIpadPad = () => {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    function bindCanvas(c) {
        if (!c || c.dataset.padBound) return;
        c.dataset.padBound = 'true';
        canvas = c;

        // [버그 수정] Scribble/제스처 인식을 위한 브라우저 힌트를 명시적으로 차단
        canvas.style.touchAction = 'none';
        canvas.setAttribute('inputmode', 'none');

        resizeCanvasKeepingContent();

        // Pointer Events: 마우스/터치/펜슬을 하나의 API로 통일 처리
        // { passive: false }로 등록해야 preventDefault()가 실제로 동작함
        canvas.addEventListener('pointerdown', (e) => {
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 캔버스 크기가 아직 0일 때 등 예외 상황 방어 */ }
            start(e);
        }, { passive: false });
        canvas.addEventListener('pointermove', move, { passive: false });
        canvas.addEventListener('pointerup', end, { passive: false });
        canvas.addEventListener('pointercancel', end, { passive: false });
        canvas.addEventListener('pointerleave', end, { passive: false });

        // 화면 회전/창 크기 변화 시 캔버스 해상도 재조정 (내용 유지)
        window.addEventListener('resize', () => {
            if (canvas.offsetParent !== null) resizeCanvasKeepingContent();
        });

        // [버그 수정] 캔버스가 DOM에 나타난 시점엔 부모(flex 레이아웃)의
        // 크기 계산이 아직 끝나지 않아 rect.width/height가 0일 수 있음.
        // 이 경우 resizeCanvasKeepingContent()가 조기 종료되어 캔버스의
        // 실제 픽셀 크기가 0x0으로 남고, 이후 그림이 전혀 그려지지 않는
        // (혹은 그려져도 안 보이는) 상태가 됨 → 크기가 실제로 잡히는
        // 시점을 ResizeObserver로 감지해서 다시 한번 리사이즈를 강제한다.
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                if (canvas.width === 0 || canvas.height === 0) {
                    resizeCanvasKeepingContent();
                }
            });
            ro.observe(canvas);
        }
    }

    // ─── [버그 수정] MutationObserver로 캔버스 등장을 즉시 감지 ─────────────
    // setTimeout 재시도(최대 1초 지연) 대신, DOM에 나타나는 순간 바로 리스너를 붙인다.
    function watchForCanvas() {
        // 이미 있으면 즉시 바인딩
        const existing = getCanvas();
        if (existing) bindCanvas(existing);

        // 이후 DOM 변화(모드 전환, 화면 폭 변경 등)를 계속 감시
        const observer = new MutationObserver(() => {
            const c = getCanvas();
            if (c && !c.dataset.padBound) bindCanvas(c);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchForCanvas);
    } else {
        watchForCanvas();
    }
})();
