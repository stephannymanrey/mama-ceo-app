$f = 'src\App.jsx'
$lines = Get-Content $f -Encoding UTF8
$fixed = $lines | ForEach-Object {
    $_ -replace 'Ç¸', 'é' `
       -replace 'Ç§ltimos', 'últimos' `
       -replace 'Ç§', 'ú' `
       -replace 'ÇÇ', 'ó' `
       -replace 'Çü', 'ó' `
       -replace 'Ç­', 'á' `
       -replace 'Çn', 'ón' `
       -replace 'Ç-', 'x' `
       -replace '¶¨', '¿' `
       -replace 'quÇ¸', 'qué' `
       -replace 'AnÇ­lisis', 'Análisis' `
       -replace 'situaciÇün', 'situación' `
       -replace 'Ç', ''
}
Set-Content $f $fixed -Encoding UTF8
Write-Host "OK"
