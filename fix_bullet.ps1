$f = 'src\App.jsx'
$lines = Get-Content $f -Encoding UTF8
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match 'activas.*ventas cerradas') {
        $lines[$i] = '          <p>{activeClients} activas - {money.format(wonSalesTotal)} en ventas cerradas</p>'
        Write-Host "Corregido en linea $($i+1)"
    }
}
Set-Content $f $lines -Encoding UTF8
Write-Host "OK"
