let currentIndex = -1;

window.onload = () => {
    renderSidebar();
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    }
    if (typeof allChapters !== 'undefined' && allChapters.length > 0) {
        loadChapter(0);
    }
};

function renderSidebar() {
    const list = document.getElementById('chapter-list');
    let html = "";
    sidebarData.forEach(item => {
        if (item.type === 'group') {
            html += `<div class="group-title">${item.name}</div>`;
        } else {
            const idx = allChapters.indexOf(item.path);
            html += `<a class="chapter-link" id="link-idx-${idx}" onclick="loadChapter(${idx})">${item.name}</a>`;
        }
    });
    list.innerHTML = html;
}

async function loadChapter(idx) {
    if (idx < 0 || idx >= allChapters.length) return;
    
    currentIndex = idx;
    const path = allChapters[idx];
    const title = path.split('/').pop().replace('.txt', '');
    
    document.getElementById('chapter-title').innerText = title;
    document.getElementById('current-path').innerText = path;
    
    document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
    document.getElementById('link-idx-' + idx)?.classList.add('active');

    document.getElementById('viewer').innerText = "Đang tải...";

    try {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`Mã lỗi HTTP: ${resp.status}`);
        const text = await resp.text();
        document.getElementById('viewer').innerText = text;
        
        // Đưa thanh cuộn về đầu khi sang chương
        document.getElementById('content-area').scrollTop = 0;
        
    } catch (e) {
        document.getElementById('viewer').innerText = `Lỗi tải truyện: ${e.message}\nVui lòng thử tải lại trang.`;
    }
    
    updateButtons();

// Sau khi load xong, nếu là mobile thì đóng menu
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('overlay').classList.remove('show');
    }
}

function updateButtons() {
    document.getElementById('prevBtn').disabled = (currentIndex <= 0);
    document.getElementById('nextBtn').disabled = (currentIndex >= allChapters.length - 1);
}

function nextChapter() { loadChapter(currentIndex + 1); }
function prevChapter() { loadChapter(currentIndex - 1); }

function toggleSidebar() { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (window.innerWidth <= 768) {
        // Trên điện thoại: dùng class riêng để trượt Menu
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show');
    } else {
        // Trên máy tính: dùng class hidden để lấp đầy trang
        sidebar.classList.toggle('hidden'); 
    }
}

function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

// Bấm trái/phải để qua bài như cũ
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextChapter();
    if (e.key === 'ArrowLeft') prevChapter();
});