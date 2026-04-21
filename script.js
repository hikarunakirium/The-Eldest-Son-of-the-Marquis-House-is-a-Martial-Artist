let currentIndex = -1;

window.onload = () => {
    renderSidebar();
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.setAttribute('data-theme', 'dark');
    if (typeof allChapters !== 'undefined' && allChapters.length > 0) loadChapter(0);
};

function renderSidebar() {
    const list = document.getElementById('chapter-list');
    let html = "";
    sidebarData.forEach(item => {
        if (item.type === 'group') {
            html += `<div style="font-weight:bold; padding:15px 10px 5px; font-size:12px; color:var(--primary); text-transform:uppercase;">${item.name}</div>`;
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

    document.getElementById('chapter-title').innerText = path.split('/').pop().replace('.txt', '');
    document.getElementById('current-path').innerText = path;
    
    document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
    document.getElementById('link-idx-' + idx)?.classList.add('active');

    // Tự động đóng menu sau khi chọn xong để đọc luôn
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');

    try {
        const resp = await fetch(path);
        const text = await resp.text();
        document.getElementById('viewer').innerText = text;
        document.getElementById('content-area').scrollTop = 0;
    } catch (e) {
        document.getElementById('viewer').innerText = "Lỗi tải truyện.";
    }
    updateButtons();
}

function updateButtons() {
    document.getElementById('prevBtn').disabled = (currentIndex <= 0);
    document.getElementById('nextBtn').disabled = (currentIndex >= allChapters.length - 1);
}

function nextChapter() { loadChapter(currentIndex + 1); }
function prevChapter() { loadChapter(currentIndex - 1); }

// Hàm quan trọng để ẩn hiện Menu "lơ lửng"
function toggleSidebar() { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function toggleTheme() {
    const body = document.body;
    body.setAttribute('data-theme', body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextChapter();
    if (e.key === 'ArrowLeft') prevChapter();
});