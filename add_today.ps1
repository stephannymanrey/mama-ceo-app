$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8

$old = '          {/* Últimos movimientos + planificador */}' + "`r`n" + '          <div className="dash-bottom-row">' + "`r`n" + '            {MovementList()}' + "`r`n" + '            {CalendarCard()}' + "`r`n" + '          </div>'

$new = @'
          {/* Resumen del dia de hoy */}
          {(() => {
            const today = new Date();
            const dayNames = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
            const todayName = dayNames[today.getDay()];
            const todayTasks = homeTasks.filter((t) => !t.done).slice(0, 3);
            const todayUrgent = homeTasks.filter((t) => !t.done && t.priority === "Urgente");
            return (
              <div className="card dash-today-card">
                <div className="dash-today-header">
                  <div>
                    <p className="eyebrow">Hoy es {todayName}</p>
                    <h3 style={{margin:"4px 0 0"}}>Tu hogar hoy</h3>
                  </div>
                  <button type="button" className="dash-today-link" onClick={() => setActiveView("home")}>Ver semana completa</button>
                </div>
                {todayUrgent.length > 0 && (
                  <div style={{padding:"8px 12px",background:"var(--pink-soft)",borderRadius:"8px",fontSize:"13px",color:"var(--purple)",fontWeight:700}}>
                    Urgente: {todayUrgent.map((t) => t.title).join(", ")}
                  </div>
                )}
                {todayTasks.length === 0 && <p className="helper-copy">No tienes tareas pendientes del hogar. Buen trabajo!</p>}
                {todayTasks.map((task) => (
                  <label key={task.id} style={{display:"flex",alignItems:"center",gap:"10px",fontSize:"14px"}}>
                    <input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} style={{accentColor:"var(--green)"}} />
                    <span style={{flex:1}}>{task.title}</span>
                    {task.delegate && <small style={{color:"var(--pink)",fontWeight:700}}>{task.delegate}</small>}
                  </label>
                ))}
                {homeTasks.filter((t) => !t.done).length > 3 && (
                  <p className="helper-copy">+{homeTasks.filter((t) => !t.done).length - 3} tareas mas. <button type="button" style={{border:"none",background:"none",color:"var(--purple)",fontWeight:700,cursor:"pointer",padding:0}} onClick={() => setActiveView("home")}>Ver todas</button></p>
                )}
              </div>
            );
          })()}

          {/* Ultimos movimientos + planificador */}
          <div className="dash-bottom-row">
            {MovementList()}
            {CalendarCard()}
          </div>
'@

$result = $c.Replace($old, $new)
if ($result -eq $c) { Write-Host "NO MATCH" } else { Set-Content $f $result -Encoding UTF8; Write-Host "OK" }
