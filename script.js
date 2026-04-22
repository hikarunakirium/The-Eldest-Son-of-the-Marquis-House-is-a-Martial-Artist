let maxLoadedIndex = -1;
let isFetching = false;
let observer;
let currentReadingIndex = 0; // Theo dõi chương đang hiển thị trên màn hình
let savedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]'); 

window.onload = () => {
    renderSidebar();
    renderBookmarks();
    loadSettings();
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme')) {
        document.body.setAttribute('data-theme', 'dark');
    }

    // Tối ưu hóa bộ theo dõi: Chỉ kích hoạt khi chương chiếm 10% màn hình
    observer = new IntersectionObserver(handleIntersection, {
        root: document.getElementById('content-area'),
        rootMargin: '0px',
        threshold: 0.1
    });

    document.getElementById('content-area').addEventListener('scroll', checkInfiniteScroll);

    // TỰ ĐỘNG TẢI TIẾN TRÌNH
    const lastRead = localStorage.getItem('lastRead');
    if (typeof allChapters !== 'undefined' && allChapters.length > 0) {
        if (lastRead !== null && allChapters.length > parseInt(lastRead)) {
            loadChapterStartFresh(parseInt(lastRead));
        } else {
            loadChapterStartFresh(0);
        }
    }
};

/* ================= CÀI ĐẶT & GIAO DIỆN ================= */
function loadSettings() {
    const theme = localStorage.getItem('theme');
    if (theme) document.body.setAttribute('data-theme', theme);
    const fFamily = localStorage.getItem('r-font') || "'Times New Roman', serif";
    const fSize = localStorage.getItem('r-size') || "21";
    const fLine = localStorage.getItem('r-line') || "1.8";
    document.getElementById('fontFamily').value = fFamily;
    document.getElementById('fontSize').value = fSize;
    document.getElementById('lineHeight').value = fLine;
    applySettings(false);
}

function applySettings(save = true) {
    const fFamily = document.getElementById('fontFamily').value;
    const fSize = document.getElementById('fontSize').value;
    const fLine = document.getElementById('lineHeight').value;
    document.getElementById('fontSizeVal').innerText = fSize;
    document.getElementById('lineHeightVal').innerText = fLine;
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

/* ================= LOGIC ĐỌC TRUYỆN (INFINITE SCROLL & AUTO-SAVE) ================= */

// Hàm gọi khi nhảy chương từ Mục lục
async function loadChapterStartFresh(idx) {
    if (idx < 0 || idx >= allChapters.length) return;
    closeAllPanels();

    // FIX LỖI BOOKMARK: Ép cập nhật chương hiện tại ngay lập tức!
    currentReadingIndex = parseInt(idx);
    localStorage.setItem('lastRead', currentReadingIndex);

    // Xóa màu active cũ và gán màu active mới ngay trên Sidebar
    document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
    document.getElementById('link-idx-' + currentReadingIndex)?.classList.add('active');
    document.getElementById('bm-link-idx-' + currentReadingIndex)?.classList.add('active');

    const container = document.getElementById('reader-container');
    
    // FIX LỖI OBSERVER: Ngắt theo dõi các chương cũ trước khi dọn dẹp DOM
    Array.from(container.children).forEach(box => observer.unobserve(box));
    
    container.innerHTML = ""; // Dọn sạch nội dung
    maxLoadedIndex = currentReadingIndex - 1; // Cài lại mốc tải

    // Cuộn trang lên sát viền trên cùng
    document.getElementById('content-area').scrollTop = 0;

    // Tải chương mới
    await fetchAndAppendChapter(currentReadingIndex);
}

async function fetchAndAppendChapter(idx) {
    if (idx >= allChapters.length || isFetching) return;
    isFetching = true;
    document.getElementById('loading-spinner').style.display = 'block';

    const path = allChapters[idx];
    const title = path.split('/').pop().replace('.txt', '');

    try {
        const resp = await fetch(path);
        const text = await resp.text();
        const box = document.createElement('div');
        box.className = 'chapter-box';
        box.setAttribute('data-idx', idx);
        box.innerHTML = `<h2>${title}</h2><pre class="chapter-content">${text}</pre>`;
        
        document.getElementById('reader-container').appendChild(box);
        
        // Bắt đầu theo dõi khung chương mới thêm vào
        observer.observe(box);
        maxLoadedIndex = idx;
    } catch (e) {
        console.error("Lỗi khi load chương:", e);
    }
    
    document.getElementById('loading-spinner').style.display = 'none';
    isFetching = false;
}

function checkInfiniteScroll() {
    const area = document.getElementById('content-area');
    // Khi cuộn còn cách đáy 800px thì tự động tải thêm
    if (area.scrollHeight - area.scrollTop - area.clientHeight < 800) {
        if (!isFetching && maxLoadedIndex < allChapters.length - 1) {
            fetchAndAppendChapter(maxLoadedIndex + 1);
        }
    }
}

function handleIntersection(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const visibleIdx = parseInt(entry.target.getAttribute('data-idx'));
            currentReadingIndex = visibleIdx;
            
            // AUTO-SAVE khi cuộn
            localStorage.setItem('lastRead', visibleIdx); 

            document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
            document.getElementById('link-idx-' + visibleIdx)?.classList.add('active');
            document.getElementById('bm-link-idx-' + visibleIdx)?.classList.add('active'); 
        }
    });
}

/* ================= BOOKMARK ================= */
function addBookmark() {
    if (!savedBookmarks.includes(currentReadingIndex)) {
        savedBookmarks.push(currentReadingIndex);
        localStorage.setItem('bookmarks', JSON.stringify(savedBookmarks));
        renderBookmarks();
        
        // Lấy tên file để hiện thông báo cho rõ ràng
        const title = allChapters[currentReadingIndex].split('/').pop().replace('.txt', '');
        alert(`🔖 Đã lưu thành công:\n${title}`);
    } else {
        alert("Chương này đã có trong Bookmark rồi.");
    }
}

function removeBookmark(event, idx) {
    event.stopPropagation();
    savedBookmarks = savedBookmarks.filter(id => id !== idx);
    localStorage.setItem('bookmarks', JSON.stringify(savedBookmarks));
    renderBookmarks();
}

function renderBookmarks() {
    const list = document.getElementById('bookmark-list');
    if(savedBookmarks.length === 0) {
        list.innerHTML = "<div style='font-size:13px; color:gray;'>Chưa có bookmark nào. Hãy bấm 'Đánh dấu' khi đang đọc!</div>";
        return;
    }
    let html = "";
    savedBookmarks.forEach(idx => {
        const path = allChapters[idx];
        if(!path) return;
        const title = path.split('/').pop().replace('.txt', '');
        html += `<div style="display:flex; align-items:center; gap:5px; margin-bottom:4px;">
            <a class="chapter-link" id="bm-link-idx-${idx}" style="flex:1; margin:0; font-size:14px;" onclick="loadChapterStartFresh(${idx})">🔖 ${title}</a>
            <button onclick="removeBookmark(event, ${idx})" style="padding:6px 10px; border:none; background:var(--bg); color:red; border-radius:4px;">✕</button>
        </div>`;
    });
    list.innerHTML = html;
}

/* ================= XUẤT/NHẬP DỮ LIỆU (BACKUP) ================= */
function exportData() {
    const data = {
        lastRead: localStorage.getItem('lastRead'),
        bookmarks: localStorage.getItem('bookmarks'),
        theme: localStorage.getItem('theme'),
        'r-font': localStorage.getItem('r-font'),
        'r-size': localStorage.getItem('r-size'),
        'r-line': localStorage.getItem('r-line')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Marquis-Reader-Backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.lastRead !== undefined) localStorage.setItem('lastRead', data.lastRead);
            if (data.bookmarks !== undefined) localStorage.setItem('bookmarks', data.bookmarks);
            if (data.theme !== undefined) localStorage.setItem('theme', data.theme);
            if (data['r-font'] !== undefined) localStorage.setItem('r-font', data['r-font']);
            if (data['r-size'] !== undefined) localStorage.setItem('r-size', data['r-size']);
            if (data['r-line'] !== undefined) localStorage.setItem('r-line', data['r-line']);
            
            alert("✅ Phục hồi dữ liệu thành công! Trang web sẽ được tải lại.");
            location.reload();
        } catch (err) {
            alert("❌ Lỗi: File dữ liệu không hợp lệ.");
        }
    };
    reader.readAsText(file);
}

/* ================= HÀM BỔ TRỢ ================= */
function renderSidebar() {
    const list = document.getElementById('chapter-list');
    let html = "";
    sidebarData.forEach(item => {
        if (item.type === 'group') {
            html += `<div style="font-weight:800; padding:15px 10px 5px; font-size:12px; color:var(--primary); text-transform:uppercase;">${item.name}</div>`;
        } else {
            const idx = allChapters.indexOf(item.path);
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