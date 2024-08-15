// 캔버스 및 컨텍스트 설정
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const magnifier = document.getElementById('magnifier');
const magCtx = magnifier.getContext('2d');
const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d');

// 상태 변수
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentMode = 'draw';
let blobData = [];
let currentPath = [];
let drawnPath = new Path2D();

// 색상 설정
const drawColor = '#2196f3';
const removeColor = '#f44336';

// 히스토리 관련 변수
let history = [];
let currentStep = -1;

// 마그네틱 라쏘 관련 변수
let isUsingMagneticLasso = true;
let magneticThreshold = 20;
let blobEdges = [];

// DOM 요소
const toggleMagneticLassoBtn = document.getElementById('toggleMagneticLassoBtn');
const magneticLassoLabel = document.getElementById('magneticLassoLabel');
const magneticThresholdSlider = document.getElementById('magneticThresholdSlider');

// 유틸리티 함수
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    redrawAll();
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

// 그리기 관련 함수
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPosition(e);
    currentPath = [{x: lastX, y: lastY}];
    updateMagnifier(lastX, lastY);
}

function draw(e) {
    if (!isDrawing) return;
    let [x, y] = getPosition(e);
    
    if (isUsingMagneticLasso) {
        const magneticPoint = findNearestEdgePoint(x, y, blobEdges);
        if (magneticPoint) {
            x = magneticPoint.x;
            y = magneticPoint.y;
        }
    }
    
    currentPath.push({x, y});
    
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

    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2, 0, Math.PI * 2);
    magCtx.clip();

    magCtx.drawImage(canvas,
        x - magSize/(2*zoomFactor), y - magSize/(2*zoomFactor), magSize/zoomFactor, magSize/zoomFactor,
        0, 0, magSize, magSize
    );

    const frameColor = currentMode === 'draw' ? drawColor : removeColor;

    magCtx.beginPath();
    magCtx.arc(magSize/2, magSize/2, magSize/2 - 2, 0, Math.PI * 2);
    magCtx.strokeStyle = frameColor;
    magCtx.lineWidth = 3;
    magCtx.stroke();

    magCtx.beginPath();
    magCtx.moveTo(magSize/2, 0);
    magCtx.lineTo(magSize/2, magSize);
    magCtx.moveTo(0, magSize/2);
    magCtx.lineTo(magSize, magSize/2);
    magCtx.strokeStyle = 'rgba(0,0,0,0.2)';
    magCtx.lineWidth = 1;
    magCtx.stroke();
}

// Blob 관련 함수
function createBlobs() {
    blobData = [];
    const numBlobs = 1;
    
    for (let i = 0; i < numBlobs; i++) {
        createSingleBlob();
    }
    redrawAll();
    blobEdges = detectBlobEdges();
}

function createSingleBlob() {
    const maxSize = Math.min(canvas.width, canvas.height) * 0.3;
    const size = Math.random() * (maxSize - 50) + 50;
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    let blobPath = new Path2D();
    const points = 10 + Math.floor(Math.random() * 6);
    let startAngle = Math.random() * Math.PI * 2;
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

// 히스토리 관련 함수
function saveToHistory() {
    history = history.slice(0, currentStep + 1);
    
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

// 마그네틱 라쏘 관련 함수
function detectBlobEdges() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edges = [];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx + 3] > 0 && (
                data[idx - 4 + 3] === 0 ||
                data[idx + 4 + 3] === 0 ||
                data[idx - width * 4 + 3] === 0 ||
                data[idx + width * 4 + 3] === 0
            )) {
                edges.push({x, y});
            }
        }
    }
    return edges;
}

function findNearestEdgePoint(x, y, edges) {
    let nearest = null;
    let minDistance = Infinity;
    for (let edge of edges) {
        const dist = Math.sqrt((edge.x - x) ** 2 + (edge.y - y) ** 2);
        if (dist < minDistance && dist < magneticThreshold) {
            minDistance = dist;
            nearest = edge;
        }
    }
    return nearest;
}

function updateMagneticLassoButton() {
    toggleMagneticLassoBtn.classList.toggle('active', isUsingMagneticLasso);
    magneticLassoLabel.textContent = isUsingMagneticLasso ? 'Magnetic On' : 'Magnetic Off';
}

// UI 관련 함수
function updateButtonStyles() {
    const drawBtn = document.getElementById('drawBtn');
    const removeBtn = document.getElementById('removeBtn');
    
    drawBtn.classList.toggle('active', currentMode === 'draw');
    removeBtn.classList.toggle('active', currentMode === 'remove');
}

// 초기화 및 이벤트 리스너 설정
function init() {
    setCanvasSize();
    createBlobs();
    redrawAll();
    updateButtonStyles();
    updateMagneticLassoButton();
    saveToHistory();

    // 이벤트 리스너 설정
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

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('newPatientBtn').addEventListener('click', createNewPatient);
    document.getElementById('drawBtn').addEventListener('click', () => {
        currentMode = 'draw';
        updateButtonStyles();
    });
    document.getElementById('removeBtn').addEventListener('click', () => {
        currentMode = 'remove';
        updateButtonStyles();
    });
    document.getElementById('resetBtn').addEventListener('click', resetDrawing);

    toggleMagneticLassoBtn.addEventListener('click', toggleMagneticLasso);

    if (magneticThresholdSlider) {
        magneticThresholdSlider.addEventListener('input', updateMagneticThreshold);
    }

    window.addEventListener('resize', () => {
        setCanvasSize();
        createBlobs();
        redrawAll();
    });

    canvas.oncontextmenu = (e) => {
        e.preventDefault();
        return false;
    };

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
}

// 버튼 클릭 이벤트 핸들러
function createNewPatient() {
    console.log('New Patient button clicked');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnPath = new Path2D();
    createBlobs();
    redrawAll();
    
    history = [];
    currentStep = -1;
    saveToHistory();
}

function resetDrawing() {
    console.log('Reset button clicked');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnPath = new Path2D();
    redrawAll();
    
    history = [];
    currentStep = -1;
    saveToHistory();
}

function toggleMagneticLasso() {
    isUsingMagneticLasso = !isUsingMagneticLasso;
    updateMagneticLassoButton();
    console.log('Magnetic Lasso mode:', isUsingMagneticLasso ? 'enabled' : 'disabled');
}

function updateMagneticThreshold() {
    magneticThreshold = parseInt(this.value);
    console.log('Magnetic threshold set to:', magneticThreshold);
}

// 페이지 로드 시 초기화
window.addEventListener('load', init);