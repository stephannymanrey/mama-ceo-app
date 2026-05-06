$f = 'src\App.jsx'
$lines = Get-Content $f -Encoding UTF8
$lines[1607] = ''
Set-Content $f $lines -Encoding UTF8
Write-Host "OK"
