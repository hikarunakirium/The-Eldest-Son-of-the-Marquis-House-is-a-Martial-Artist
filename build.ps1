# Cấu hình
$StoryDirs = @("Eng sub", "RAW")
$OutputFile = "index.html"

# Hàm sắp xếp tên file theo kiểu tự nhiên (1, 2, 10) - Tương thích Linux & Windows
$LogicalSort = {
    param($files)
    return $files | Sort-Object { 
        [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(10, '0') }) 
    }
}

# Lấy và sắp xếp tất cả file
$RawFiles = Get-ChildItem -Path $StoryDirs -Filter "*.txt" -Recurse
$AllFiles = &$LogicalSort $RawFiles

# Tạo danh sách đường dẫn sạch cho JavaScript
$JSPathArray = $AllFiles | ForEach-Object { 
    $Path = $_.FullName.Replace((Get-Location).Path, "").TrimStart('\').TrimStart('/') -replace '\\', '/'
    "'$Path'" 
}
$JSPathList = $JSPathArray -join ","

$HtmlHeader = @"
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marquis House Reader</title>
    <style>
        :root {
            --bg-body: #f4f7f6; --bg-card: #ffffff; --text-main: #2d3436;
            --primary: #0984e3; --border: #dfe6e9; --sidebar-w: 300px;
        }
        [data-theme="dark"] {
            --bg-body: #1e272e; --bg-card: #2f3640; --text-main: #dcdde1;
            --border: #3d4650; --primary: #74b9ff;
        }
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; display: flex; background: var(--bg-body); color: var(--text-main); transition: 0.3s; height: 100vh; overflow: hidden; }
        
        /* Sidebar */
        #sidebar { width: var(--sidebar-w); background: var(--bg-card); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: 0.3s; z-index: 100; }
        #sidebar.hidden { margin-left: calc(var(--sidebar-w) * -1); }
        .sidebar-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .chapter-list { flex: 1; overflow-y: auto; padding: 10px; }
        
        /* Main View */
        #main-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .top-bar { padding: 10px 20px; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; gap: 10px; align-items: center; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        #content-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; justify-content: center; scroll-behavior: smooth; }
        .reader-box { max-width: 850px; width: 100%; background: var(--bg-card); padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); min-height: 100%; }
        
        /* Elements */
        .chapter-link { display: block; padding: 10px; text-decoration: none; color: var(--text-main); border-radius: 6px; font-size: 14px; cursor: pointer; margin-bottom: 2px; }
        .chapter-link:hover { background: var(--bg-body); }
        .chapter-link.active { background: var(--primary); color: white; }
        pre { white-space: pre-wrap; font-family: 'Georgia', serif; font-size: 19px; line-height: 1.8; margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px; }
        button { padding: 8px 16px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); border-radius: 6px; transition: 0.2s; font-weight: 500; }
        button:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
        button:disabled { opacity: 0.3; cursor: not-allowed; }
        .group-title { font-weight: bold; padding: 15px 10px 5px; font-size: 12px; text-transform: uppercase; color: var(--primary); opacity: 0.8; }
        
        @media (max-width: 768px) {
            #sidebar { position: absolute; height: 100%; }
            .reader-box { padding: 20px; }
        }
    </style>
</head>
<body>
    <aside id="sidebar">
        <div class="sidebar-header">
            <h3 style="margin:0">Mục lục</h3>
            <button onclick="toggleSidebar()">✕ Đóng</button>
        </div>
        <div class="chapter-list">
"@

$HtmlSidebar = ""
foreach ($dir in $StoryDirs) {
    if (Test-Path $dir) {
        $HtmlSidebar += "<div class='group-title'>$dir</div>"
        $Files = Get-ChildItem -Path $dir -Filter "*.txt"
        $Sorted = &$LogicalSort $Files
        foreach ($file in $Sorted) {
            $Rel = ($file.FullName.Replace((Get-Location).Path, "").TrimStart('\').TrimStart('/') -replace '\\', '/')
            $HtmlSidebar += "<a class='chapter-link' id='link-$Rel' onclick=""loadChapter('$Rel')"">$($file.BaseName)</a>"
        }
    }
}

$HtmlFooter = @"
        </div>
    </aside>

    <main id="main-view">
        <div class="top-bar">
            <button onclick="toggleSidebar()">☰ Menu</button>
            <button id="prevBtn" onclick="prevChapter()" title="Chương trước">←</button>
            <button id="nextBtn" onclick="nextChapter()" title="Chương tiếp">Sau →</button>
            <div style="flex:1; text-align:center; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" id="current-label">Đang dừng chân...</div>
            <button onclick="toggleTheme()" id="themeBtn">🌓</button>
        </div>
        <div id="content-area">
            <article class="reader-box">
                <h2 id="chapter-title" style="text-align:center; margin-bottom:10px;">Chào mừng Minh!</h2>
                <div id="viewer-container">
                    <pre id="viewer">Hãy chọn một chương từ mục lục bên trái để bắt đầu đọc truyện.</pre>
                </div>
            </article>
        </div>
    </main>

    <script>
        const allChapters = [$JSPathList];
        let currentIndex = -1;

        // Tự động nhận diện Dark Mode hệ thống
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.setAttribute('data-theme', 'dark');
        }

        function toggleTheme() {
            const current = document.body.getAttribute('data-theme');
            document.body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        }

        function toggleSidebar() { 
            document.getElementById('sidebar').classList.toggle('hidden'); 
        }

        async function loadChapter(path) {
            currentIndex = allChapters.indexOf(path);
            const cleanTitle = path.split('/').pop().replace('.txt', '');
            
            document.getElementById('chapter-title').innerText = cleanTitle;
            document.getElementById('current-label').innerText = cleanTitle;
            
            // Cập nhật trạng thái Sidebar
            document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
            const activeLink = document.getElementById('link-' + path);
            if (activeLink) activeLink.classList.add('active');

            // Hiệu ứng loading
            document.getElementById('viewer').innerText = "Đang lật trang...";

            try {
                const resp = await fetch(encodeURIComponent(path));
                if (!resp.ok) throw new Error('Không thể tải file truyện.');
                const text = await resp.text();
                document.getElementById('viewer').innerText = text;
                document.getElementById('content-area').scrollTop = 0;
            } catch (e) {
                document.getElementById('viewer').innerText = "Lỗi: " + e.message;
            }
            updateButtons();
        }

        function updateButtons() {
            document.getElementById('prevBtn').disabled = (currentIndex <= 0);
            document.getElementById('nextBtn').disabled = (currentIndex >= allChapters.length - 1 || currentIndex === -1);
        }

        function nextChapter() { if (currentIndex < allChapters.length - 1) loadChapter(allChapters[currentIndex + 1]); }
        function prevChapter() { if (currentIndex > 0) loadChapter(allChapters[currentIndex - 1]); }

        // Hỗ trợ phím mũi tên để chuyển chương
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') nextChapter();
            if (e.key === 'ArrowLeft') prevChapter();
        });
    </script>
</body>
</html>
"@

$HtmlHeader + $HtmlSidebar + $HtmlFooter | Out-File -FilePath $OutputFile -Encoding utf8
Write-Host "Website Build thành công cho Minh Quang Bùi!" -ForegroundColor Green