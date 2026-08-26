// ─── 아이패드 연습장 — 캔버스 기반 순수 필기 (텍스트 자동변환 없음) ─────
// Apple Pencil/손가락/마우스 궤적을 그대로 그림으로 남긴다.
//
// [진짜 원인] 캔버스 DOM 요소는 항상 마크업에 존재하고 CSS 미디어쿼리로만
// 보이거나 숨겨지는 구조다. 기존 코드는 "캔버스가 DOM에 나타나는 순간"을
// MutationObserver로 감지해 딱 한 번만 리스너를 붙였는데, 그 순간이 로그인
// 화면 등 .ipad-practice-pad가 display:none인 시점이면 캔버스 실제 크기가
// 0이 되어 캔버스 픽셀 해상도(width/height)가 0x0으로 굳어버린다.
// 게다가 한 번 바인딩되면 dataset.padBound 플래그 때문에 다시는 재시도되지
// 않고, display:none 요소는 ResizeObserver로도 크기 변화가 잘 안 잡혀서
// 이후 화면이 실제로 보여도 캔버스가 계속 죽어있는 상태로 남았다.
//
// [해결] "한 번만 바인딩"하는 방식을 버리고, 이벤트 리스너는 처음 한 번만
// 붙이되(중복 등록만 방지), 실제로 화면에 그림을 그리기 직전(pointerdown)
// 마다 캔버스 크기가 유효한지 검사해서 필요하면 그 자리에서 다시 계산한다.

(function initIpadPad() {
    let canvas, ctx;
    let drawing = false;
    let lastX = 0, lastY = 0;

    function getCanvas() {
        return document.getElementById('ipad-pad-canvas');
    }

    // 캔버스가 실제로 화면에 보이는 크기를 갖고 있는지 확인
    function isCanvasVisible(c) {
        const rect = c.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // 캔버스 실제 픽셀 해상도를 표시 크기에 맞춰 설정 (내용 백업 후 복원)
    function resizeCanvasKeepingContent() {
        if (!canvas) return false;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const targetW = Math.round(rect.width * dpr);
        const targetH = Math.round(rect.height * dpr);

        // 이미 올바른 해상도라면 다시 그릴 필요 없음 (내용 유지)
        if (canvas.width === targetW && canvas.height === targetH && ctx) return true;

        const backup = document.createElement('canvas');
        backup.width = canvas.width;
        backup.height = canvas.height;
        const hadContent = canvas.width > 0 && canvas.height > 0;
        if (hadContent) backup.getContext('2d').drawImage(canvas, 0, 0);

        canvas.width  = targetW;
        canvas.height = targetH;
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.2;

        if (hadContent) {
            ctx.drawImage(backup, 0, 0, backup.width, backup.height, 0, 0, rect.width, rect.height);
        }
        return true;
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function start(e) {
        // [핵심 수정] 그리기를 시작하기 직전, 캔버스가 지금 실제로 유효한
        // 크기를 갖고 있는지 매번 확인한다. display:none이었다가 방금
        // 화면에 나타난 경우(모드 전환, 화면폭 변경 등)에도 여기서 확실히
        // 잡아서 픽셀 해상도를 다시 맞춘다.
        if (!resizeCanvasKeepingContent()) return; // 아직도 크기 0이면 그리기 포기(다음 시도에 재확인)

        e.preventDefault(); // 브라우저 기본 제스처 인식(Scribble 포함) 차단
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

    function bindCanvasOnce(c) {
        if (!c || c.dataset.padListenersBound) return;
        c.dataset.padListenersBound = 'true';
        canvas = c;

        canvas.style.touchAction = 'none';
        canvas.setAttribute('inputmode', 'none');

        // Pointer Events: 마우스/터치/펜슬을 하나의 API로 통일 처리
        canvas.addEventListener('pointerdown', (e) => {
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
            start(e);
        }, { passive: false });
        canvas.addEventListener('pointermove', move, { passive: false });
        canvas.addEventListener('pointerup', end, { passive: false });
        canvas.addEventListener('pointercancel', end, { passive: false });
        canvas.addEventListener('pointerleave', end, { passive: false });

        // 화면 회전/창 크기 변화 시에도 재조정 시도
        window.addEventListener('resize', () => {
            canvas = getCanvas();
            if (canvas && isCanvasVisible(canvas)) resizeCanvasKeepingContent();
        });

        // 최초 바인딩 시점에 이미 보이는 상태라면 바로 리사이즈 시도
        if (isCanvasVisible(canvas)) resizeCanvasKeepingContent();
    }

    // ─── 캔버스가 DOM에 나타나는 즉시 리스너를 붙임 (감시는 계속 유지) ────
    function watchForCanvas() {
        const existing = getCanvas();
        if (existing) bindCanvasOnce(existing);

        const observer = new MutationObserver(() => {
            const c = getCanvas();
            if (c) {
                canvas = c;
                bindCanvasOnce(c);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchForCanvas);
    } else {
        watchForCanvas();
    }
})();
