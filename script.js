const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const magnifier = document.getElementById('magnifier');
const magCtx = magnifier.getContext('2d');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Set canvas size
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initialize
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// Drawing functions
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPosition(e);
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;

    const [x, y] = getPosition(e);

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

// Get position for both mouse and touch events
function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.type.includes('mouse')) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    } else {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    }
    return [x, y];
}

// Magnifier function
function updateMagnifier(x, y) {
    const magSize = 150;
    const zoomFactor = 2;
    const offsetY = -magSize - 10;

    magnifier.width = magSize;
    magnifier.height = magSize;
    magnifier.style.left = `${x - magSize/2}px`;
    magnifier.style.top = `${y + offsetY}px`;
    magnifier.style.display = 'block';

    magCtx.save();
    magCtx.clearRect(0, 0, magSize, magSize);
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2, 0, Math.PI * 2);
    magCtx.clip();

    magCtx.drawImage(canvas,
        x - magSize/(2*zoomFactor), y - magSize/(2*zoomFactor), magSize/zoomFactor, magSize/zoomFactor,
        0, 0, magSize, magSize
    );

    magCtx.restore();
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 1.5, 0, Math.PI * 2);
    magCtx.strokeStyle = 'red';
    magCtx.lineWidth = 3;
    magCtx.stroke();
}

// Event listeners for mouse
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        draw(e);
    } else {
        magnifier.style.display = 'none';
    }
});
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Event listeners for touch
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e.touches[0]);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDrawing) {
        draw(e.touches[0]);
    } else {
        magnifier.style.display = 'none';
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
}, { passive: false });

// Prevent default touch behavior
function preventDefault(e) {
    e.preventDefault();
}

// Disable page refresh on pull-down
document.body.addEventListener('touchmove', preventDefault, { passive: false });

// Disable context menu
canvas.oncontextmenu = function(e) {
    e.preventDefault();
    return false;
};

// Prevent any other default behavior that might interfere
window.addEventListener('scroll', preventDefault, { passive: false });
window.addEventListener('touchmove', preventDefault, { passive: false });

console.log('Script loaded with magnifier and enhanced touch support');
