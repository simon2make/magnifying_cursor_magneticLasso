const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const magnifier = document.getElementById('magnifier');
const magCtx = magnifier.getContext('2d');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

setCanvasSize();
window.addEventListener('resize', setCanvasSize);

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPosition(e);
    drawDot(lastX, lastY);
    updateMagnifier(lastX, lastY);
}

function draw(e) {
    if (!isDrawing) return;
    let [x, y] = getPosition(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    [lastX, lastY] = [x, y];
    updateMagnifier(x, y);
}

function stopDrawing() {
    isDrawing = false;
    magnifier.style.display = 'none';
}


function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return [x, y];
}

function drawDot(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
}

function updateMagnifier(x, y) {
    const magSize = 100;
    const zoomFactor = 2.5; // 확대 비율을 높임

    // 돋보기 위치 및 크기 설정
    magnifier.width = magSize;
    magnifier.height = magSize;
    magnifier.style.left = `${x - magSize/2}px`;
    magnifier.style.top = `${y - magSize - 30}px`; // 커서 위에 위치
    magnifier.style.display = 'block';
    magnifier.style.position = 'absolute';
    magnifier.style.pointerEvents = 'none';

    magCtx.clearRect(0, 0, magSize, magSize);

    // 원형 클리핑 영역 생성
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 3, 0, Math.PI * 2);
    magCtx.clip();

    // 반투명한 흰색 배경 추가
    magCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    magCtx.fill();

    // 확대된 내용 그리기
    magCtx.drawImage(canvas,
        x - magSize/(2*zoomFactor), y - magSize/(2*zoomFactor), magSize/zoomFactor, magSize/zoomFactor,
        0, 0, magSize, magSize
    );

    // 빨간색 원형 테두리 그리기
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 1.5, 0, Math.PI * 2);
    magCtx.strokeStyle = 'red';
    magCtx.lineWidth = 8; //테두리 두께.
    magCtx.stroke();
}

function handleStart(e) {
    e.preventDefault();
    startDrawing(e.touches ? e.touches[0] : e);
}

function handleMove(e) {
    e.preventDefault();
    if (isDrawing) {
        draw(e.touches ? e.touches[0] : e);
    }
}


function handleEnd(e) {
    e.preventDefault();
    stopDrawing();
}

canvas.addEventListener('mousedown', handleStart, { passive: false });
canvas.addEventListener('mousemove', handleMove, { passive: false });
canvas.addEventListener('mouseup', handleEnd, { passive: false });
canvas.addEventListener('mouseout', handleEnd, { passive: false });

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

function preventDefault(e) {
    e.preventDefault();
}

document.body.addEventListener('touchmove', preventDefault, { passive: false });
document.body.addEventListener('scroll', preventDefault, { passive: false });

canvas.oncontextmenu = function(e) {
    e.preventDefault();
    return false;
};

ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.strokeStyle = 'black';

// Initialize magnifier
updateMagnifier(0, 0);

function createBlobs() {
    const numBlobs = 1; // 1 또는 2개의 블롭 생성
    
    for (let i = 0; i < numBlobs; i++) {
        createSingleBlob();
    }
}

function createSingleBlob() {
    const maxSize = Math.min(canvas.width, canvas.height) * 0.3; // 캔버스 크기의 30%를 최대 크기로
    const size = Math.random() * (maxSize - 50) + 50; // 50에서 maxSize 사이의 랜덤 크기
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(200, 100, 100, 0.6)'; // 반투명한 붉은색 (상처 색상)

    const points = 10 + Math.floor(Math.random() * 6); // 10~15개의 제어점 (더 적은 제어점)
    let startAngle = Math.random() * Math.PI * 2;
    let firstX, firstY;

    for (let i = 0; i <= points; i++) {
        const angle = startAngle + (i / points) * Math.PI * 2;
        const radiusVariation = Math.random() * 0.3 + 0.5; // 0.85 ~ 1.15 사이의 변동 (더 작은 변동)
        const radius = (size / 2) * radiusVariation;
        const blobX = x + Math.cos(angle) * radius;
        const blobY = y + Math.sin(angle) * radius;

        if (i === 0) {
            ctx.moveTo(blobX, blobY);
            firstX = blobX;
            firstY = blobY;
        } else {
            const prevAngle = startAngle + ((i - 1) / points) * Math.PI * 2;
            const midAngle = (prevAngle + angle) / 2;
            const controlRadius = radius * (Math.random() * 0.2 + 0.9); // 0.9 ~ 1.1 사이의 변동 (더 작은 변동)
            const controlX = x + Math.cos(midAngle) * controlRadius;
            const controlY = y + Math.sin(midAngle) * controlRadius;
            
            ctx.quadraticCurveTo(controlX, controlY, blobX, blobY);
        }
    }

    // 마지막 점과 첫 점을 부드럽게 연결
    const lastAngle = startAngle + Math.PI * 2;
    const midAngle = (lastAngle + startAngle) / 2;
    const midRadius = (size / 2) * (Math.random() * 0.2 + 0.9);
    const controlX = x + Math.cos(midAngle) * midRadius;
    const controlY = y + Math.sin(midAngle) * midRadius;
    ctx.quadraticCurveTo(controlX, controlY, firstX, firstY);

    ctx.closePath();
    ctx.fill();
}

function addWoundTexture(x, y, size) {
    const lineCount = Math.floor(Math.random() * 5) + 3; // 3~7개의 선
    ctx.strokeStyle = 'rgba(150, 50, 50, 0.3)'; // 어두운 붉은색
    ctx.lineWidth = 1;

    for (let i = 0; i < lineCount; i++) {
        const startAngle = Math.random() * Math.PI * 2;
        const endAngle = startAngle + (Math.random() * Math.PI / 2 - Math.PI / 4);
        const radius = size * (Math.random() * 0.3 + 0.2);

        ctx.beginPath();
        ctx.moveTo(
            x + Math.cos(startAngle) * radius,
            y + Math.sin(startAngle) * radius
        );
        ctx.lineTo(
            x + Math.cos(endAngle) * radius,
            y + Math.sin(endAngle) * radius
        );
        ctx.stroke();
    }
}

document.getElementById('newPatientBtn').addEventListener('click', function() {
    console.log('New Patient button clicked');
    // 캔버스 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 새로운 블롭들 생성
    createBlobs();
});
