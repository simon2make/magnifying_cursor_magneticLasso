const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
// const customCursor = document.getElementById('customCursor');
const magnifier = document.getElementById('magnifier');
const magCtx = magnifier.getContext('2d');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentMode = 'draw';
let blobData = [];
let currentPath = [];
let drawnPath = new Path2D();
let tempCanvas = document.createElement('canvas');
let tempCtx = tempCanvas.getContext('2d');

const drawColor = '#2196f3';  // Draw 버튼 색상
const removeColor = '#f44336';  // Remove 버튼 색상

let history = [];
let currentStep = -1;

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
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
    
    // 임시 선 그리기 (시각적 피드백)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        let path = new Path2D();
        path.moveTo(currentPath[0].x, currentPath[0].y);
        for (let point of currentPath) {
            path.lineTo(point.x, point.y);
        }
        path.closePath();

        if (currentMode === 'draw') {
            drawnPath.addPath(path);
        } else if (currentMode === 'remove') {
            removeFromPath(path);
        }

        // 현재 상태를 히스토리에 저장
        saveToHistory();
    }

    currentPath = [];
    redrawAll();
    updateUndoRedoButtons();
}

function removeFromPath(removePath) {
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.fillStyle = 'black';
    tempCtx.fill(drawnPath);
    
    tempCtx.globalCompositeOperation = 'destination-out';
    tempCtx.fill(removePath);
    tempCtx.globalCompositeOperation = 'source-over';
    
    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    drawnPath = new Path2D();
    
    for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
            let index = (y * tempCanvas.width + x) * 4;
            if (imageData.data[index + 3] > 0) {
                drawnPath.rect(x, y, 1, 1);
            }
        }
    }
}

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawBlobs();
    ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
    ctx.fill(drawnPath);
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
    if (!isDrawing) {
        magnifier.style.display = 'none';
        return;
    }

    const magSize = 100;
    const zoomFactor = 2.5;

    magnifier.width = magSize;
    magnifier.height = magSize;
    magnifier.style.left = `${x - magSize/2}px`;
    magnifier.style.top = `${y - magSize - 30}px`;
    magnifier.style.display = 'block';

    magCtx.fillStyle = 'white';
    magCtx.fillRect(0, 0, magSize, magSize);

    // 클리핑 영역을 돋보기 크기와 일치시킴
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2, 0, Math.PI * 2);
    magCtx.clip();

    magCtx.drawImage(canvas,
        x - magSize/(2*zoomFactor), y - magSize/(2*zoomFactor), magSize/zoomFactor, magSize/zoomFactor,
        0, 0, magSize, magSize
    );

    // 프레임 색상 설정
    const frameColor = currentMode === 'draw' ? drawColor : removeColor;

    // 프레임 그리기 (돋보기 내부에)
    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 2, 0, Math.PI * 2);
    magCtx.strokeStyle = frameColor;
    magCtx.lineWidth = 3;
    magCtx.stroke();

    // 십자선 그리기
    magCtx.beginPath();
    magCtx.moveTo(magSize/2, 0);
    magCtx.lineTo(magSize/2, magSize);
    magCtx.moveTo(0, magSize/2);
    magCtx.lineTo(magSize, magSize/2);
    magCtx.strokeStyle = 'rgba(0,0,0,0.2)';
    magCtx.lineWidth = 1;
    magCtx.stroke();
}

function createBlobs() {
    blobData = [];
    const numBlobs = 1;
    
    for (let i = 0; i < numBlobs; i++) {
        createSingleBlob();
    }
    redrawAll();  // Blob 생성 후 다시 그리기
}

function createSingleBlob() {
    const maxSize = Math.min(canvas.width, canvas.height) * 0.3;
    const size = Math.random() * (maxSize - 50) + 50;
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    let blobPath = new Path2D();
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
            blobPath.moveTo(blobX, blobY);
            firstX = blobX;
            firstY = blobY;
        } else {
            const prevAngle = startAngle + ((i - 1) / points) * Math.PI * 2;
            const midAngle = (prevAngle + angle) / 2;
            const controlRadius = radius * (Math.random() * 0.2 + 0.9);
            const controlX = x + Math.cos(midAngle) * controlRadius;
            const controlY = y + Math.sin(midAngle) * controlRadius;
            
            blobPath.quadraticCurveTo(controlX, controlY, blobX, blobY);
        }
    }

    blobPath.closePath();

    blobData.push({
        path: blobPath,
        center: {x, y},
        size: size,
        points: blobPoints
    });
}

function redrawBlobs() {
    ctx.fillStyle = 'rgba(200, 100, 100, 0.6)';
    blobData.forEach(blob => {
        ctx.fill(blob.path);
    });
}

function toggleDrawMode() {
    isDrawMode = !isDrawMode;
    updateButtonStyles();
}

function updateButtonStyles() {
    const drawBtn = document.getElementById('drawBtn');
    const removeBtn = document.getElementById('removeBtn');
    
    drawBtn.classList.toggle('active', currentMode === 'draw');
    removeBtn.classList.toggle('active', currentMode === 'remove');
}

function saveToHistory() {
    // 현재 스텝 이후의 기록 제거
    history = history.slice(0, currentStep + 1);
    
    // 현재 상태 저장 (Path2D 객체를 복사)
    let pathCopy = new Path2D(drawnPath);
    history.push(pathCopy);
    currentStep++;
    
    updateUndoRedoButtons();
}

function undo() {
    if (currentStep > 0) {
        currentStep--;
        drawnPath = new Path2D(history[currentStep]);
        redrawAll();
        updateUndoRedoButtons();
    }
}

function redo() {
    if (currentStep < history.length - 1) {
        currentStep++;
        drawnPath = new Path2D(history[currentStep]);
        redrawAll();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = (currentStep <= 0);
    document.getElementById('redoBtn').disabled = (currentStep >= history.length - 1);
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        draw(e);
    }
});
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
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

saveToHistory();

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
    drawnPath = new Path2D();
    createBlobs();
    redrawAll();
    
    // 히스토리 초기화
    history = [];
    currentStep = -1;
    saveToHistory();
});

document.getElementById('drawBtn').addEventListener('click', function() {
    currentMode = 'draw';
    updateButtonStyles();
});

document.getElementById('removeBtn').addEventListener('click', function() {
    currentMode = 'remove';
    updateButtonStyles();
});

document.getElementById('undoBtn').addEventListener('click', function() {
    console.log('Undo button clicked');
    // Implement undo functionality
});

document.getElementById('redoBtn').addEventListener('click', function() {
    console.log('Redo button clicked');
    // Implement redo functionality
});

document.getElementById('resetBtn').addEventListener('click', function() {
    console.log('Reset button clicked');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnPath = new Path2D();
    redrawAll();
    
    // 히스토리 초기화
    history = [];
    currentStep = -1;
    saveToHistory();
});

updateButtonStyles();
createBlobs();
redrawAll();