const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const magnifier = document.getElementById('magnifier');

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
    drawDot(lastX, lastY); // Draw a dot when starting
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
    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }
    return [x, y];
}

function drawDot(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
}

function updateMagnifier(x, y) {
    magnifier.style.left = `${x - 50}px`;
    magnifier.style.top = `${y - 160}px`; // Position above finger
    magnifier.style.display = 'block';
    magnifier.style.backgroundImage = `url(${canvas.toDataURL()})`;
    magnifier.style.backgroundPosition = `-${x - 50}px -${y - 50}px`;
    magnifier.style.backgroundSize = `${canvas.width}px ${canvas.height}px`;
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

// Prevent default touch behaviors
function preventDefault(e) {
    e.preventDefault();
}

document.body.addEventListener('touchmove', preventDefault, { passive: false });
document.body.addEventListener('scroll', preventDefault, { passive: false });

// Disable context menu
canvas.oncontextmenu = function(e) {
    e.preventDefault();
    return false;
};

ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.strokeStyle = 'black';

console.log('Mobile-friendly script loaded');

