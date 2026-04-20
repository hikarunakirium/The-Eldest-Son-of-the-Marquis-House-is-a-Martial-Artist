# Cấu hình các thư mục chứa truyện
$StoryDirs = @("Eng sub", "RAW")
$OutputFile = "index.html"

# Lấy danh sách tất cả file .txt từ các thư mục và sắp xếp
$AllFiles = Get-ChildItem -Path $StoryDirs -Filter "*.txt" -Recurse | Sort-Object Name

# Tạo danh sách đường dẫn để JavaScript sử dụng
$JSPathArray = $AllFiles | ForEach-Object { "'$($_.RelativePath -replace '\\', '/')'" }
$JSPathList = $JSPathArray -join ","

# Bắt đầu xây dựng nội dung HTML
$HtmlHeader = @"
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marquis House Reader</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; height: 100vh; margin: 0; background: #e9ecef; }
        #sidebar { width: 320px; border-right: 1px solid #dee2e6; overflow-y: auto; padding: 20px; background: #fff; }
        #content { flex: 1; padding: 40px; overflow-y: auto; display: flex; flex-direction: column; align-items: center; }
        .reader-container { max-width: 800px; width: 100%; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .nav-buttons { margin-bottom: 20px; display: flex; gap: 10px; position: sticky; top: 0; background: #fff; padding: 10px; width: 100%; justify-content: center; border-bottom: 1px solid #eee; }
        button { padding: 10px 20px; cursor: pointer; border: none; background: #007bff; color: white; border-radius: 5px; font-weight: bold; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .chapter-link { display: block; padding: 8px 12px; color: #333; text-decoration: none; border-radius: 4px; font-size: 14px; margin-bottom: 5px; cursor: pointer; }
        .chapter-link:hover { background: #f0f0f0; color: #007bff; }
        .active { background: #007bff !important; color: white !important; }
        pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Georgia', serif; font-size: 18px; line-height: 1.8; color: #2c3e50; }
        h2 { margin-top: 0; color: #343a40; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div id="sidebar">
        <h3>Mục lục</h3>
"@

$HtmlSidebar = ""
foreach ($dir in $StoryDirs) {
    if (Test-Path $dir) {
        $HtmlSidebar += "<div style='font-weight:bold; margin: 15px 0 5px 0; color: #666; border-bottom: 1px solid #eee;'>$dir</div>"
        $Files = Get-ChildItem -Path $dir -Filter "*.txt" | Sort-Object Name
        foreach ($file in $Files) {
            $RelativePath = ($file.FullName.Replace((Get-Location).Path, "").TrimStart('\') -replace '\\', '/')
            $FileNameClean = $file.BaseName
            $HtmlSidebar += "<a class='chapter-link' id='link-$RelativePath' onclick=""loadChapter('$RelativePath')"">$FileNameClean</a>"
        }
    }
}

$HtmlFooter = @"
    </div>
    <div id="content">
        <div class="nav-buttons">
            <button id="prevBtn" onclick="prevChapter()" disabled>Chương trước</button>
            <button id="nextBtn" onclick="nextChapter()" disabled>Chương sau</button>
        </div>
        <div class="reader-container">
            <h2 id="chapter-title">Chọn chương để đọc</h2>
            <pre id="viewer">Chào mừng! Hãy chọn một chương từ danh sách bên trái để bắt đầu.</pre>
        </div>
    </div>

    <script>
        const allChapters = [$JSPathList];
        let currentIndex = -1;

        async function loadChapter(path) {
            currentIndex = allChapters.indexOf(path);
            const title = path.split('/').pop().replace('.txt', '');
            document.getElementById('chapter-title').innerText = title;
            
            // UI Update
            document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));
            const activeLink = document.getElementById('link-' + path);
            if(activeLink) activeLink.classList.add('active');

            try {
                const resp = await fetch(encodeURIComponent(path));
                const text = await resp.text();
                document.getElementById('viewer').innerText = text;
                document.getElementById('content').scrollTop = 0;
            } catch (e) {
                document.getElementById('viewer').innerText = "Lỗi khi tải chương: " + e;
            }
            
            updateButtons();
        }

        function updateButtons() {
            document.getElementById('prevBtn').disabled = (currentIndex <= 0);
            document.getElementById('nextBtn').disabled = (currentIndex >= allChapters.length - 1 || currentIndex === -1);
        }

        function nextChapter() { if (currentIndex < allChapters.length - 1) loadChapter(allChapters[currentIndex + 1]); }
        function prevChapter() { if (currentIndex > 0) loadChapter(allChapters[currentIndex - 1]); }
    </script>
</body>
</html>
"@

$HtmlHeader + $HtmlSidebar + $HtmlFooter | Out-File -FilePath $OutputFile -Encoding utf8
Write-Host "Đã tạo xong file $OutputFile thành công!" -ForegroundColor Green