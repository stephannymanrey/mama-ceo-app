$f = 'src\App.jsx'
$lines = Get-Content $f -Encoding UTF8
$lines[1277] = '            <p className="helper-copy">{cashFlow >= 0 ? "Tienes margen positivo este mes. Cuida los gastos variables." : "Tus gastos fijos superan tus ingresos. Revisa que puedes reducir."}</p>'
$lines[1285] = '              <div><h3>Movimientos</h3><p className="helper-copy">Tus ultimos registros.</p></div>'
$lines[1321] = '            <p className="helper-copy">Analisis inteligente de tu situacion actual.</p>'
Set-Content $f $lines -Encoding UTF8
Write-Host "OK"
