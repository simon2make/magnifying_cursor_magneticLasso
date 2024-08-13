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
    const magSize = 120;
    const zoomFactor = 2;
    const offsetY = -magSize - 20;

    magnifier.width = magSize;
    magnifier.height = magSize;
    magnifier.style.left = `${x - magSize/2}px`;
    magnifier.style.top = `${y + offsetY}px`;
    magnifier.style.display = 'block';

    magCtx.save();
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2, 0, Math.PI * 2);
    magCtx.clip();

    magCtx.drawImage(canvas,
        x - magSize/(2*zoomFactor), y - magSize/(2*zoomFactor), magSize/zoomFactor, magSize/zoomFactor,
        0, 0, magSize, magSize
    );

    magCtx.restore();
}

function handleStart(e) {
    e.preventDefault();
    startDrawing(e.touches ? e.touches[0] : e);
}

function handleMove(e) {
    e.preventDefault();
    draw(e.touches ? e.touches[0] : e);
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

console.log('Mobile-friendly script loaded with magnifier');
