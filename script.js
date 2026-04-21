let currentIndex = -1;

// 1. Khởi tạo trang
window.onload = () => {
    renderSidebar();
    // Tự động nhận diện Dark Mode hệ thống
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    }
    // Load chương đầu tiên ngay khi mở trang
    if (typeof allChapters !== 'undefined' && allChapters.length > 0) {
        loadChapter(0); // Load theo số thứ tự (index 0)
    }
};

// 2. Đổ dữ liệu vào Sidebar bằng Số thứ tự (Index)
function renderSidebar() {
    const list = document.getElementById('chapter-list');
    let html = "";
    sidebarData.forEach(item => {
        if (item.type === 'group') {
            html += `<div class="group-title">${item.name}</div>`;
        } else {
            // Lấy số thứ tự của chương trong mảng allChapters
            const idx = allChapters.indexOf(item.path);
            
            // Dùng số (idx) truyền vào hàm giúp tránh 100% lỗi dấu nháy và khoảng trắng
            html += `<a class="chapter-link" id="link-idx-${idx}" onclick="loadChapter(${idx})">${item.name}</a>`;
        }
    });
    list.innerHTML = html;
}

// 3. Logic Load Chương
async function loadChapter(idx) {
    if (idx < 0 || idx >= allChapters.length) return;
    
    currentIndex = idx;
    const path = allChapters[idx];
    const title = path.split('/').pop().replace('.txt', '');
    
    document.getElementById('chapter-title').innerText = title;
    document.getElementById('current-path').innerText = path;
    
    // Active link trong sidebar
    document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
    document.getElementById('link-idx-' + idx)?.classList.add('active');

    document.getElementById('viewer').innerText = "Đang lật trang...";

    try {
        // Trình duyệt tự động mã hóa URL, không cần dùng encodeURIComponent
        const resp = await fetch(path);
        
        if (!resp.ok) throw new Error(`Mã lỗi HTTP: ${resp.status} - Không tìm thấy file`);
        
        const text = await resp.text();
        document.getElementById('viewer').innerText = text;
        document.getElementById('content-area').scrollTop = 0;
    } catch (e) {
        document.getElementById('viewer').innerText = 
            `Không thể tải truyện: ${e.message}\n\n` + 
            `Cách khắc phục:\n` +
            `1. Bấm tổ hợp phím Ctrl + F5 để xóa cache trình duyệt.\n` + 
            `2. Kiểm tra link website có bị thiếu dấu gạch chéo ở cuối (/) không.`;
    }
    updateButtons();
}

// 4. Các hàm bổ trợ
function updateButtons() {
    document.getElementById('prevBtn').disabled = (currentIndex <= 0);
    document.getElementById('nextBtn').disabled = (currentIndex >= allChapters.length - 1);
}

function nextChapter() { loadChapter(currentIndex + 1); }
function prevChapter() { loadChapter(currentIndex - 1); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('hidden'); }
function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

// Hỗ trợ phím tắt chuyển chương
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextChapter();
    if (e.key === 'ArrowLeft') prevChapter();
});