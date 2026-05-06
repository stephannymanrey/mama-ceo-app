$f = 'src\App.jsx'
$lines = Get-Content $f -Encoding UTF8
$lines[1237] = '    const healthLabel = healthScore === "green" ? "Negocio saludable"'
$lines[1238] = '      : healthScore === "orange" ? "Atencion requerida" : "Alerta financiera";'
Set-Content $f $lines -Encoding UTF8
Write-Host "OK"
