let currentIndex = -1;

// 1. Khởi tạo trang
window.onload = () => {
    renderSidebar();
    // Tự động nhận diện Dark Mode hệ thống
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    }
    // Load chương đầu tiên (Chap 1 Prologue) ngay khi mở trang
    if (typeof allChapters !== 'undefined' && allChapters.length > 0) {
        loadChapter(allChapters[0]);
    }
};

// 2. Đổ dữ liệu vào Sidebar
function renderSidebar() {
    const list = document.getElementById('chapter-list');
    let html = "";
    sidebarData.forEach(item => {
        if (item.type === 'group') {
            html += `<div class="group-title">${item.name}</div>`;
        } else {
            html += `<a class="chapter-link" id="link-${item.path}" onclick="loadChapter('${item.path}')">${item.name}</a>`;
        }
    });
    list.innerHTML = html;
}

// 3. Logic Load Chương
async function loadChapter(path) {
    currentIndex = allChapters.indexOf(path);
    const title = path.split('/').pop().replace('.txt', '');
    
    document.getElementById('chapter-title').innerText = title;
    document.getElementById('current-path').innerText = path;
    
    // Active link trong sidebar
    document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
    document.getElementById('link-' + path)?.classList.add('active');

    try {
        const resp = await fetch(encodeURIComponent(path));
        const text = await resp.text();
        document.getElementById('viewer').innerText = text;
        document.getElementById('content-area').scrollTop = 0;
    } catch (e) {
        document.getElementById('viewer').innerText = "Không thể tải nội dung chương này.";
    }
    updateButtons();
}

// 4. Các hàm bổ trợ
function updateButtons() {
    document.getElementById('prevBtn').disabled = (currentIndex <= 0);
    document.getElementById('nextBtn').disabled = (currentIndex >= allChapters.length - 1);
}

function nextChapter() { if (currentIndex < allChapters.length - 1) loadChapter(allChapters[currentIndex + 1]); }
function prevChapter() { if (currentIndex > 0) loadChapter(allChapters[currentIndex - 1]); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('hidden'); }
function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

// Hỗ trợ phím tắt
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextChapter();
    if (e.key === 'ArrowLeft') prevChapter();
});