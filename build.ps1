$StoryDirs = @("Eng sub", "RAW")
$DataFile = "data.js"

# Hàm sắp xếp tự nhiên
$LogicalSort = {
    param($files)
    return $files | Sort-Object { [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(10, '0') }) }
}

$RawFiles = Get-ChildItem -Path $StoryDirs -Filter "*.txt" -Recurse
$AllFiles = &$LogicalSort $RawFiles

# Tạo nội dung cho data.js
$AllPaths = $AllFiles | ForEach-Object { 
    $p = $_.FullName.Replace((Get-Location).Path, "").TrimStart('\').TrimStart('/') -replace '\\', '/'
    "'$p'" 
}
$JSPaths = "const allChapters = [" + ($AllPaths -join ",") + "];`n"

$JSData = "const sidebarData = [`n"
foreach ($dir in $StoryDirs) {
    if (Test-Path $dir) {
        $JSData += "  { type: 'group', name: '$dir' },`n"
        $Files = Get-ChildItem -Path $dir -Filter "*.txt"
        $Sorted = &$LogicalSort $Files
        foreach ($file in $Sorted) {
            $Rel = ($file.FullName.Replace((Get-Location).Path, "").TrimStart('\').TrimStart('/') -replace '\\', '/')
            $JSData += "  { type: 'chapter', name: '$($file.BaseName)', path: '$Rel' },`n"
        }
    }
}
$JSData += "];"

$JSPaths + $JSData | Out-File -FilePath $DataFile -Encoding utf8
Write-Host "Đã cập nhật dữ liệu chương mới vào $DataFile!" -ForegroundColor Green