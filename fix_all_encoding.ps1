$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8
# Corregir bullet corrupto â€¢ -> -
$c = $c -replace '\u00e2\u0080\u00a2', '-'
# Corregir comillas tipograficas corruptas
$c = $c -replace '\u00e2\u0080\u009c', '"'
$c = $c -replace '\u00e2\u0080\u009d', '"'
# Corregir guion largo corrupto
$c = $c -replace '\u00e2\u0080\u0094', '-'
Set-Content $f $c -Encoding UTF8
Write-Host "OK"
