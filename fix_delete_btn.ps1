$f = 'src\App.jsx'
$lines = Get-Content $f -Encoding UTF8
$lines[1309] = '                  <button type="button" className="row-delete" onClick={() => confirmDelete("Eliminar?", () => setIncomeSources((c) => c.filter((s) => s.id !== src.id)))}>x</button>'
Set-Content $f $lines -Encoding UTF8
Write-Host "OK"
