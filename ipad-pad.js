// ─── [변경] 아이패드 연습장 — 캔버스 기반 순수 필기 (텍스트 자동변환 없음) ─
// Apple Pencil/손가락/마우스 궤적을 그대로 그림으로 남긴다.
// textarea를 쓰면 Scribble 기능이 손글씨를 텍스트로 바꿔버리므로,
// canvas + Pointer Events로 순수 드로잉만 구현한다.

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
        drawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function move(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    }

    function end() {
        drawing = false;
    }

    // ─── 지우기 버튼 ─────────────────────────────────────────────────────
    window.clearIpadPad = () => {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    function attach() {
        const c = getCanvas();
        if (!c || c.dataset.padBound) return;
        c.dataset.padBound = 'true';
        canvas = c;

        resizeCanvasKeepingContent();

        // Pointer Events: 마우스/터치/펜슬을 하나의 API로 통일 처리
        canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); start(e); });
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('pointerleave', end);

        // 화면 회전/창 크기 변화 시 캔버스 해상도 재조정 (내용 유지)
        window.addEventListener('resize', () => {
            if (canvas.offsetParent !== null) resizeCanvasKeepingContent();
        });
    }

    // 연습장은 900px 이상(아이패드)에서만 존재하므로, 화면 크기가 바뀌어
    // 뒤늦게 나타나는 경우(태블릿 회전 등)에도 대응하도록 주기적으로 확인
    function tryAttachLoop() {
        attach();
        setTimeout(tryAttachLoop, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryAttachLoop);
    } else {
        tryAttachLoop();
    }
})();
