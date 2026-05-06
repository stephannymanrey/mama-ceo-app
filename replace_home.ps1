$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8
$start = $c.IndexOf('  function renderHome()')
$end = $c.IndexOf('  function renderCeo()')

$newFunc = @'
  function renderHome() {
    const homeProgress = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const mentalLoad = homeTasks.filter((t) => !t.done).length;
    const mentalLoadLevel = mentalLoad >= 8 ? "alta" : mentalLoad >= 4 ? "media" : "baja";
    const mentalLoadColor = mentalLoad >= 8 ? "var(--purple)" : mentalLoad >= 4 ? "var(--orange)" : "var(--green)";
    const familyDaysCount = Object.values(purpose.familyDays || {}).filter(Boolean).length;
    const delegatedTasks = homeTasks.filter((t) => t.delegate && t.delegate.trim() !== "");
    const urgentTasks = homeTasks.filter((t) => !t.done && t.priority === "Urgente");

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Hogar</h2>
          <p>{completedHomeTasks}/{homeTasks.length} tareas completadas esta semana</p>
        </div>

        {/* KPIs */}
        <div className="home-kpi-row">
          <div className="client-kpi">
            <span>Tareas completadas</span>
            <strong style={{color:"var(--green)"}}>{completedHomeTasks}/{homeTasks.length}</strong>
            <small>{homeProgress}% del hogar</small>
          </div>
          <div className="client-kpi">
            <span>Carga mental</span>
            <strong style={{color: mentalLoadColor}}>{mentalLoadLevel}</strong>
            <small>{mentalLoad} pendientes</small>
          </div>
          <div className="client-kpi">
            <span>Disponible familiar</span>
            <strong style={{fontSize:"14px"}}>{money.format(homeAvailable)}</strong>
            <small>despues de gastos</small>
          </div>
          <div className="client-kpi">
            <span>Dias de presencia</span>
            <strong style={{color: familyDaysCount >= 4 ? "var(--green)" : "var(--orange)"}}>{familyDaysCount} dias</strong>
            <small>{familyDaysCount >= 4 ? "excelente semana" : "puedes mejorar"}</small>
          </div>
        </div>

        {/* Alertas */}
        {mentalLoad >= 8 && (
          <div className="alert-banner alert-red" style={{marginBottom:"14px"}}>
            Tu carga mental esta alta con {mentalLoad} tareas pendientes. Revisa cuales puedes delegar o eliminar hoy.
          </div>
        )}
        {urgentTasks.length > 0 && (
          <div className="alert-banner alert-orange" style={{marginBottom:"14px"}}>
            Tienes {urgentTasks.length} tarea{urgentTasks.length > 1 ? "s" : ""} urgente{urgentTasks.length > 1 ? "s" : ""}: {urgentTasks.map((t) => t.title).join(", ")}
          </div>
        )}

        {/* Layout principal */}
        <div className="home-main-layout">

          {/* Columna izquierda: formularios */}
          <div className="home-left-col">

            {/* Agregar tarea */}
            <form className="card home-form-card" onSubmit={addHomeTask}>
              <h3>Nueva tarea</h3>
              <input placeholder="Tarea del hogar" value={homeForm.title} onChange={(e) => updateHomeForm("title", e.target.value)} required />
              <select value={homeForm.category} onChange={(e) => updateHomeForm("category", e.target.value)}>
                <option>Rutina</option>
                <option>Compras</option>
                <option>Colegio / Ninos</option>
                <option>Salud</option>
                <option>Hogar / Limpieza</option>
                <option>Bienestar</option>
                <option>Calendario</option>
              </select>
              <select value={homeForm.priority} onChange={(e) => updateHomeForm("priority", e.target.value)}>
                <option>Normal</option>
                <option>Urgente</option>
                <option>Puede esperar</option>
              </select>
              <input placeholder="Delegar a... (opcional)" value={homeForm.delegate} onChange={(e) => updateHomeForm("delegate", e.target.value)} />
              <button className="primary-button" type="submit">Guardar tarea</button>
            </form>

            {/* Lista de mercado */}
            <div className="card home-form-card" style={{marginTop:"0"}}>
              <h3>Lista de mercado</h3>
              <p className="helper-copy">Agrega lo que necesitas comprar esta semana.</p>
              <form onSubmit={(e) => { e.preventDefault(); if (!groceryForm.trim()) return; setGroceryList((c) => [...c, { id: Date.now(), text: groceryForm.trim(), done: false }]); setGroceryForm(""); }} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px"}}>
                <input placeholder="Ej: Leche, pan, frutas..." value={groceryForm} onChange={(e) => setGroceryForm(e.target.value)}
                  style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 12px",font:"inherit",background:"#FAF7F5"}} />
                <button className="primary-button" type="submit" style={{minHeight:"40px",padding:"0 14px"}}>+</button>
              </form>
              <div style={{display:"grid",gap:"6px",marginTop:"8px"}}>
                {groceryList.map((item) => (
                  <label key={item.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",border:"1px solid var(--line)",borderRadius:"8px",background: item.done ? "rgba(47,159,112,0.06)" : "#fff"}}>
                    <input type="checkbox" checked={item.done} onChange={() => setGroceryList((c) => c.map((g) => g.id === item.id ? { ...g, done: !g.done } : g))} style={{accentColor:"var(--green)"}} />
                    <span style={{flex:1,fontSize:"14px",textDecoration: item.done ? "line-through" : "none",color: item.done ? "var(--muted)" : "var(--ink)"}}>{item.text}</span>
                    <button type="button" onClick={() => setGroceryList((c) => c.filter((g) => g.id !== item.id))}
                      style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",lineHeight:1}}>x</button>
                  </label>
                ))}
                {groceryList.length === 0 && <p className="helper-copy">Tu lista esta vacia.</p>}
              </div>
            </div>
          </div>

          {/* Columna derecha: tareas + presupuesto */}
          <div className="home-right-col">

            {/* Tareas del hogar */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <h3 style={{margin:0}}>Rutinas y pendientes</h3>
                <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                  <Progress value={homeProgress} tone="green" />
                  <b style={{fontSize:"13px",minWidth:"36px",textAlign:"right"}}>{homeProgress}%</b>
                </div>
              </div>
              {homeTasks.length === 0 && <p className="helper-copy">Agrega tu primera tarea del hogar.</p>}
              {["Urgente", "Normal", "Puede esperar"].map((priority) => {
                const tasks = homeTasks.filter((t) => (t.priority || "Normal") === priority);
                if (tasks.length === 0) return null;
                return (
                  <div key={priority} style={{marginBottom:"12px"}}>
                    <p style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color: priority === "Urgente" ? "var(--purple)" : priority === "Normal" ? "var(--muted)" : "var(--muted)",margin:"0 0 6px"}}>{priority}</p>
                    {tasks.map((task) => (
                      <div key={task.id} className="home-task-row">
                        <input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} style={{accentColor:"var(--green)",flexShrink:0}} />
                        <div style={{flex:1,minWidth:0}}>
                          <strong style={{fontSize:"14px",textDecoration: task.done ? "line-through" : "none",color: task.done ? "var(--muted)" : "var(--ink)"}}>{task.title}</strong>
                          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"2px"}}>
                            <small style={{color:"var(--muted)"}}>{task.category}</small>
                            {task.delegate && <small style={{color:"var(--pink)",fontWeight:700}}>Delegar a: {task.delegate}</small>}
                          </div>
                        </div>
                        <button type="button" onClick={() => confirmDelete("Eliminar?", () => setHomeTasks((c) => c.filter((t) => t.id !== task.id)))}
                          style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",flexShrink:0}}>x</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {delegatedTasks.length > 0 && (
                <div style={{marginTop:"12px",padding:"10px 12px",background:"var(--pink-soft)",borderRadius:"10px"}}>
                  <p style={{margin:"0 0 6px",fontSize:"12px",fontWeight:800,color:"var(--purple)"}}>DELEGADAS ({delegatedTasks.length})</p>
                  {delegatedTasks.map((t) => <p key={t.id} style={{margin:"2px 0",fontSize:"13px",color:"var(--ink)"}}>{t.title} - {t.delegate}</p>)}
                </div>
              )}
            </div>

            {/* Presupuesto del hogar */}
            <div className="home-budget-card card">
              <div className="budget-head">
                <div><h3>Presupuesto del hogar</h3><p>Ingresos, gastos y disponible familiar.</p></div>
                <div className="budget-total"><span>Disponible</span><strong>{money.format(homeAvailable)}</strong></div>
              </div>
              <form className="home-budget-form" onSubmit={addHomeBudgetItem}>
                <select value={homeBudgetForm.type} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, type: e.target.value }))}><option>Ingreso</option><option>Gasto fijo</option><option>Gasto variable</option><option>Gasto hormiga</option><option>Deuda</option><option>Ahorro</option></select>
                <input placeholder="Descripcion" value={homeBudgetForm.description} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, description: e.target.value }))} />
                <input type="number" min="0" placeholder="Monto" value={homeBudgetForm.amount} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, amount: e.target.value }))} />
                <button className="primary-button" type="submit">Agregar</button>
              </form>
              <div className="home-money-insights">
                <article><span>Ganando</span><strong>{money.format(homeBudgetTotals.income)}</strong></article>
                <article><span>Gastando</span><strong>{money.format(homeSpent)}</strong></article>
                <article><span>Mayor fuga</span><strong>{biggestHomeLeak[0]}</strong><small>{money.format(biggestHomeLeak[1])}</small></article>
                <article><span>Ahorro</span><strong>{money.format(homeBudgetTotals.savings)}</strong></article>
              </div>
              <div className="money-track">
                <span style={{width:`${Math.min(100, homeBudgetTotals.income ? (homeSpent/homeBudgetTotals.income)*100 : 0)}%`}}></span>
                <small>Gastado vs ingresos del hogar</small>
              </div>
              <div className="budget-list">{homeBudget.map((item) => <DataRow key={item.id} title={item.description} meta={item.type} value={money.format(item.amount)} onDelete={() => setHomeBudget((c) => c.filter((r) => r.id !== item.id))} />)}</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

'@

$result = $c.Substring(0, $start) + $newFunc + $c.Substring($end)
Set-Content $f $result -Encoding UTF8
Write-Host "OK"
