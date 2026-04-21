let maxLoadedIndex = -1; // Đánh dấu chương xa nhất đã load trong DOM
let isFetching = false;  // Tránh load đè nhiều lần
let observer; // Dùng để soi xem người dùng đang đọc chương nào

window.onload = () => {
    renderSidebar();
    loadSettings(); // Tải cài đặt người dùng đã lưu
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme')) {
        document.body.setAttribute('data-theme', 'dark');
    }

    // Thiết lập tính năng theo dõi chương đang hiển thị trên màn hình
    observer = new IntersectionObserver(handleIntersection, {
        root: document.getElementById('content-area'),
        rootMargin: '0px',
        threshold: 0.1 // 10% của chương xuất hiện là tính
    });

    // Lắng nghe sự kiện cuộn để vô hạn scroll
    document.getElementById('content-area').addEventListener('scroll', checkInfiniteScroll);

    if (typeof allChapters !== 'undefined' && allChapters.length > 0) {
        loadChapterStartFresh(0); // Mở web là load luôn chương đầu
    }
};

/* =========================================
   1. QUẢN LÝ CÀI ĐẶT (SETTINGS)
========================================= */
function loadSettings() {
    const theme = localStorage.getItem('theme');
    if (theme) document.body.setAttribute('data-theme', theme);

    const fFamily = localStorage.getItem('r-font') || "'Times New Roman', serif";
    const fSize = localStorage.getItem('r-size') || "21";
    const fLine = localStorage.getItem('r-line') || "1.8";

    document.getElementById('fontFamily').value = fFamily;
    document.getElementById('fontSize').value = fSize;
    document.getElementById('lineHeight').value = fLine;

    applySettings(false); // Áp dụng ngay mà không cần lưu lại
}

function applySettings(save = true) {
    const fFamily = document.getElementById('fontFamily').value;
    const fSize = document.getElementById('fontSize').value;
    const fLine = document.getElementById('lineHeight').value;

    // Cập nhật số hiển thị
    document.getElementById('fontSizeVal').innerText = fSize;
    document.getElementById('lineHeightVal').innerText = fLine;

    // Đẩy vào CSS Variables toàn cục
    document.documentElement.style.setProperty('--r-font', fFamily);
    document.documentElement.style.setProperty('--r-size', fSize + 'px');
    document.documentElement.style.setProperty('--r-line', fLine);

    if (save) {
        localStorage.setItem('r-font', fFamily);
        localStorage.setItem('r-size', fSize);
        localStorage.setItem('r-line', fLine);
    }
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

/* =========================================
   2. LOGIC TẢI TRUYỆN & VÔ HẠN SCROLL
========================================= */

// Gọi khi bấm từ mục lục (Xóa hết cũ, tải lại một chương)
async function loadChapterStartFresh(idx) {
    if (idx < 0 || idx >= allChapters.length) return;
    
    // Đóng sidebar nếu đang ở Mobile
    closeAllPanels();

    const container = document.getElementById('reader-container');
    container.innerHTML = ""; // Xóa bảng trắng
    maxLoadedIndex = idx - 1; // Reset mốc

    await fetchAndAppendChapter(idx);
}

// Hàm nòng cốt: Tải text và gắn thêm (append) vào đuôi
async function fetchAndAppendChapter(idx) {
    if (idx >= allChapters.length || isFetching) return;
    isFetching = true;
    document.getElementById('loading-spinner').style.display = 'block';

    const path = allChapters[idx];
    const title = path.split('/').pop().replace('.txt', '');

    try {
        const resp = await fetch(path);
        const text = await resp.text();

        // Tạo cục DOM mới cho chương này
        const box = document.createElement('div');
        box.className = 'chapter-box';
        box.setAttribute('data-idx', idx); // Gắn tem số thứ tự cho Observer
        box.innerHTML = `<h2>${title}</h2><pre class="chapter-content">${text}</pre>`;

        document.getElementById('reader-container').appendChild(box);
        observer.observe(box); // Cho vào tầm ngắm để đổi link Menu

        maxLoadedIndex = idx;
    } catch (e) {
        console.error("Lỗi khi load chương:", e);
    }

    document.getElementById('loading-spinner').style.display = 'none';
    isFetching = false;
}

// Bắt sự kiện cuộn xuống sát đáy
function checkInfiniteScroll() {
    const area = document.getElementById('content-area');
    // Khi cuộn còn cách đáy 800px thì tự gọi chương tiếp theo
    if (area.scrollHeight - area.scrollTop - area.clientHeight < 800) {
        if (!isFetching && maxLoadedIndex < allChapters.length - 1) {
            fetchAndAppendChapter(maxLoadedIndex + 1);
        }
    }
}

// Cập nhật thanh Menu Trái khi người dùng đang cuộn qua các chương
function handleIntersection(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const visibleIdx = entry.target.getAttribute('data-idx');
            document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
            document.getElementById('link-idx-' + visibleIdx)?.classList.add('active');
        }
    });
}

/* =========================================
   3. GIAO DIỆN CHUNG & MENU
========================================= */
function renderSidebar() {
    const list = document.getElementById('chapter-list');
    let html = "";
    sidebarData.forEach(item => {
        if (item.type === 'group') {
            html += `<div style="font-weight:800; padding:15px 10px 5px; font-size:12px; color:var(--primary); text-transform:uppercase;">${item.name}</div>`;
        } else {
            const idx = allChapters.indexOf(item.path);
            // Click mục lục sẽ gọi hàm xóa màn hình (Start Fresh)
            html += `<a class="chapter-link" id="link-idx-${idx}" onclick="loadChapterStartFresh(${idx})">${item.name}</a>`;
        }
    });
    list.innerHTML = html;
}

function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('settings-panel').classList.remove('open');
    checkOverlay();
}

function toggleSettings() { 
    document.getElementById('settings-panel').classList.toggle('open');
    document.getElementById('sidebar').classList.remove('open');
    checkOverlay();
}

function closeAllPanels() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

function checkOverlay() {
    const isAnyOpen = document.getElementById('sidebar').classList.contains('open') || 
                      document.getElementById('settings-panel').classList.contains('open');
    document.getElementById('overlay').classList.toggle('show', isAnyOpen);
}