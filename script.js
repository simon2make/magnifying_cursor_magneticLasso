const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const magnifier = document.getElementById('magnifier');
const magCtx = magnifier.getContext('2d');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let isDrawMode = true;
let blobData = [];
let currentPath = [];
let drawnAreas = [];

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawAll();
}

setCanvasSize();
window.addEventListener('resize', setCanvasSize);

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPosition(e);
    currentPath = [{x: lastX, y: lastY}];
    updateMagnifier(lastX, lastY);
}

function draw(e) {
    if (!isDrawing) return;
    let [x, y] = getPosition(e);
    
    currentPath.push({x, y});
    
    // Temporary line for visual feedback
    redrawAll();
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    for (let point of currentPath) {
        ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    
    [lastX, lastY] = [x, y];
    updateMagnifier(x, y);
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    magnifier.style.display = 'none';

    if (currentPath.length > 2) {
        if (isDrawMode) {
            drawnAreas.push(currentPath);
            redrawAll();
        } else {
            eraseInsidePath();
        }
    }

    currentPath = [];
}

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawBlobs();
    redrawDrawnAreas();
}

function redrawDrawnAreas() {
    if (drawnAreas.length === 0) return;

    ctx.fillStyle = 'rgba(0, 100, 255, 0.3)'; // Semi-transparent blue
    ctx.beginPath();

    for (let path of drawnAreas) {
        ctx.moveTo(path[0].x, path[0].y);
        for (let point of path) {
            ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
    }

    ctx.fill('nonzero'); // Use 'nonzero' fill rule for union
}

function eraseInsidePath() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
            if (isPointInPath(x, y)) {
                const index = (y * canvas.width + x) * 4;
                data[index + 3] = 0; // Set alpha to 0 (transparent)
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
    redrawAll();
}

function isPointInPath(x, y) {
    let isInside = false;
    for (let i = 0, j = currentPath.length - 1; i < currentPath.length; j = i++) {
        const xi = currentPath[i].x, yi = currentPath[i].y;
        const xj = currentPath[j].x, yj = currentPath[j].y;
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
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

function updateMagnifier(x, y) {
    const magSize = 100;
    const zoomFactor = 2.5;

    magnifier.width = magSize;
    magnifier.height = magSize;
    magnifier.style.left = `${x - magSize/2}px`;
    magnifier.style.top = `${y - magSize - 30}px`;
    magnifier.style.display = 'block';
    magnifier.style.position = 'absolute';
    magnifier.style.pointerEvents = 'none';

    magCtx.clearRect(0, 0, magSize, magSize);

    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 3, 0, Math.PI * 2);
    magCtx.clip();

    magCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    magCtx.fill();

    magCtx.drawImage(canvas,
        x - magSize/(2*zoomFactor), y - magSize/(2*zoomFactor), magSize/zoomFactor, magSize/zoomFactor,
        0, 0, magSize, magSize
    );

    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 1.5, 0, Math.PI * 2);
    magCtx.strokeStyle = 'red';
    magCtx.lineWidth = 8;
    magCtx.stroke();
}

function createBlobs() {
    blobData = [];
    const numBlobs = 1;
    
    for (let i = 0; i < numBlobs; i++) {
        createSingleBlob();
    }
}

function createSingleBlob() {
    const maxSize = Math.min(canvas.width, canvas.height) * 0.3;
    const size = Math.random() * (maxSize - 50) + 50;
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(200, 100, 100, 0.6)';

    const points = 10 + Math.floor(Math.random() * 6);
    let startAngle = Math.random() * Math.PI * 2;
    let firstX, firstY;
    let blobPoints = [];

    for (let i = 0; i <= points; i++) {
        const angle = startAngle + (i / points) * Math.PI * 2;
        const radiusVariation = Math.random() * 0.3 + 0.5;
        const radius = (size / 2) * radiusVariation;
        const blobX = x + Math.cos(angle) * radius;
        const blobY = y + Math.sin(angle) * radius;

        blobPoints.push({x: blobX, y: blobY});

        if (i === 0) {
            ctx.moveTo(blobX, blobY);
            firstX = blobX;
            firstY = blobY;
        } else {
            const prevAngle = startAngle + ((i - 1) / points) * Math.PI * 2;
            const midAngle = (prevAngle + angle) / 2;
            const controlRadius = radius * (Math.random() * 0.2 + 0.9);
            const controlX = x + Math.cos(midAngle) * controlRadius;
            const controlY = y + Math.sin(midAngle) * controlRadius;
            
            ctx.quadraticCurveTo(controlX, controlY, blobX, blobY);
        }
    }

    const lastAngle = startAngle + Math.PI * 2;
    const midAngle = (lastAngle + startAngle) / 2;
    const midRadius = (size / 2) * (Math.random() * 0.2 + 0.9);
    const controlX = x + Math.cos(midAngle) * midRadius;
    const controlY = y + Math.sin(midAngle) * midRadius;
    ctx.quadraticCurveTo(controlX, controlY, firstX, firstY);

    ctx.closePath();
    ctx.fill();

    blobData.push({
        center: {x, y},
        size: size,
        points: blobPoints
    });
}

function redrawBlobs() {
    blobData.forEach(blob => {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(200, 100, 100, 0.6)';
        
        blob.points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        
        ctx.closePath();
        ctx.fill();
    });
}

function toggleDrawMode() {
    isDrawMode = !isDrawMode;
    updateButtonStyles();
}

function updateButtonStyles() {
    const drawBtn = document.getElementById('drawBtn');
    const removeBtn = document.getElementById('removeBtn');
    
    if (isDrawMode) {
        drawBtn.style.backgroundColor = '#4CAF50';
        removeBtn.style.backgroundColor = '#808080';
    } else {
        drawBtn.style.backgroundColor = '#808080';
        removeBtn.style.backgroundColor = '#4CAF50';
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e.touches[0]);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e.touches[0]);
}, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.body.addEventListener('scroll', (e) => e.preventDefault(), { passive: false });

canvas.oncontextmenu = (e) => {
    e.preventDefault();
    return false;
};

ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.strokeStyle = 'black';

document.getElementById('newPatientBtn').addEventListener('click', function() {
    console.log('New Patient button clicked');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnAreas = [];
    createBlobs();
    redrawAll(); // Add this line to ensure the new blob is drawn immediately
});

document.getElementById('drawBtn').addEventListener('click', function() {
    isDrawMode = true;
    updateButtonStyles();
});

document.getElementById('removeBtn').addEventListener('click', function() {
    isDrawMode = false;
    updateButtonStyles();
});

updateButtonStyles();
createBlobs();
redrawAll(); // Add this line to ensure the initial blob is drawn