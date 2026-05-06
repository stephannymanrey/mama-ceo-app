$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace '\u00c3\u00b7', 'x'
Set-Content $f $c -Encoding UTF8
Write-Host "OK"
