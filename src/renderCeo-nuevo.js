  function renderCeo() {
    const selfCareScore = [purpose.water, purpose.walk, purpose.silence, purpose.devotional].filter(Boolean).length;
    const familyDaysCount = Object.values(purpose.familyDays || {}).filter(Boolean).length;
    const incomePerHour = purpose.hoursWorked > 0 ? Math.round(totals.income / purpose.hoursWorked) : 0;
    const peaceScore = ["inspirada", "feliz"].includes(purpose.mood) ? 100 : ["cansada"].includes(purpose.mood) ? 50 : 20;
    const mentalAdvice = purpose.mood === "controladora"
      ? "Cambia control por presencia. Elige una cosa que sí depende de ti y suelta una que no."
      : purpose.mood === "abrumada"
        ? "Reduce la lista a una sola acción visible. No tienes que hacerlo todo hoy."
        : purpose.mood === "cansada"
          ? "Protégete. El descanso también es productividad."
          : "Usa tu energía sin sobreexigirte. Deja espacio para gracia y descanso.";
    const impactScore = Math.round(((familyDaysCount/7)*0.3 + (selfCareScore/4)*0.2 + (purpose.connectionMoments/3)*0.2 + (purpose.clientsImpacted/5)*0.15 + (purpose.systemsPercent/100)*0.15) * 100);
    
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Propósito & Impacto</h2>
          <p>Mide lo que realmente importa — presencia, energía, sistemas e impacto</p>
        </div>

        {/* Banner de afirmación destacado */}
        <div className="card" style={{background:"linear-gradient(135deg, #f8f4f1 0%, #fef9f6 100%)",border:"2px solid #e8d5c4",padding:"24px",marginBottom:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"12px"}}>
            <span style={{fontSize:"32px"}}>✨</span>
            <div style={{flex:1}}>
              <p style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color:"var(--purple)",margin:0}}>Tu afirmación de hoy</p>
              <h3 style={{fontSize:"18px",lineHeight:1.4,margin:"6px 0 0",color:"#6f2f4b"}}>{todayAffirmation}</h3>
            </div>
          </div>
          <div style={{display:"flex",gap:"20px",alignItems:"center",marginTop:"16px",paddingTop:"16px",borderTop:"1px solid #e8d5c4"}}>
            <div style={{flex:1}}>
              <p style={{fontSize:"12px",color:"var(--muted)",margin:"0 0 4px"}}>Índice de impacto esta semana</p>
              <Progress value={impactScore} tone="purple" />
            </div>
            <strong style={{fontSize:"28px",color:"var(--purple)"}}>{impactScore}%</strong>
          </div>
        </div>

        {/* KPIs visuales mejorados */}
        <div className="purpose-kpi-grid">
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">👩👦</span>
            <strong>{purpose.connectionMoments}</strong>
            <small>momentos de conexión hoy</small>
            <span className={purpose.connectionMoments >= 2 ? "kpi-badge good" : "kpi-badge alert"}>meta: 2–3</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">💸</span>
            <strong>{money.format(incomePerHour)}</strong>
            <small>ingreso por hora trabajada</small>
            <span className="kpi-badge neutral">KPI estrella</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">⚡</span>
            <strong>{purpose.energy === "alto" ? "Alta" : purpose.energy === "medio" ? "Media" : "Baja"}</strong>
            <small>energía del día</small>
            <span className={peaceScore >= 80 ? "kpi-badge good" : peaceScore >= 50 ? "kpi-badge neutral" : "kpi-badge alert"}>{purpose.mood}</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">👥</span>
            <strong>{purpose.clientsImpacted}</strong>
            <small>clientes impactados esta semana</small>
            <span className="kpi-badge neutral">impacto real</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">📅</span>
            <strong>{familyDaysCount}</strong>
            <small>días de presencia consciente</small>
            <span className={familyDaysCount >= 4 ? "kpi-badge good" : "kpi-badge alert"}>{familyDaysCount >= 4 ? "excelente" : "puedes mejorar"}</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">🔄</span>
            <strong>{purpose.systemsPercent}%</strong>
            <small>tareas sistematizadas</small>
            <span className={purpose.systemsPercent >= 60 ? "kpi-badge good" : "kpi-badge neutral"}>meta: 60%+</span>
          </div>
        </div>

        <div className="purpose-sections">

          {/* Presencia real - mejorado */}
          <div className="card purpose-block">
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
              <span style={{fontSize:"32px"}}>👩👦</span>
              <div>
                <h3 style={{margin:0}}>Presencia real</h3>
                <p className="helper-copy" style={{margin:"2px 0 0"}}>Puedes pasar todo el día en casa y no estar. Mide lo que importa.</p>
              </div>
            </div>
            <div style={{background:"rgba(47,159,112,0.08)",borderRadius:"12px",padding:"16px",marginBottom:"16px"}}>
              <label className="purpose-field" style={{marginBottom:0}}>
                <span style={{fontSize:"13px",fontWeight:700}}>Momentos de conexión hoy (sin celular, sin multitarea)</span>
                <div className="counter-row" style={{marginTop:"8px"}}>
                  <button type="button" onClick={() => updatePurpose("connectionMoments", Math.max(0, (purpose.connectionMoments || 0) - 1))}>-</button>
                  <strong style={{fontSize:"24px"}}>{purpose.connectionMoments || 0}</strong>
                  <button type="button" onClick={() => updatePurpose("connectionMoments", (purpose.connectionMoments || 0) + 1)}>+</button>
                </div>
                <small style={{display:"block",textAlign:"center",marginTop:"6px",color:"var(--muted)"}}>Meta: 2-3 momentos al día</small>
              </label>
            </div>
            <label className="purpose-field"><span>Días de presencia consciente esta semana</span></label>
            <div className="week-checks">
              {["L","M","X","J","V","S","D"].map((day) => (
                <button type="button" className={purpose.familyDays?.[day] ? "checked" : ""} key={day}
                  onClick={() => setPurpose((c) => ({ ...c, familyDays: { ...c.familyDays, [day]: !c.familyDays?.[day] } }))}>{day}</button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"8px",padding:"8px 12px",background:familyDaysCount >= 5 ? "rgba(47,159,112,0.1)" : "rgba(201,96,122,0.1)",borderRadius:"8px"}}>
              <span style={{fontSize:"13px",fontWeight:700}}>{familyDaysCount} de 7 días</span>
              <span style={{fontSize:"12px",color:familyDaysCount >= 5 ? "var(--green)" : "var(--pink)",fontWeight:700}}>{familyDaysCount >= 5 ? "¡Excelente semana!" : "Puedes mejorar"}</span>
            </div>
            <textarea className="purpose-textarea" placeholder="¿Cómo crees que se sintió tu hijo/a esta semana? (reflexión libre)" value={purpose.mentalLoad} onChange={(e) => updatePurpose("mentalLoad", e.target.value)} style={{marginTop:"12px"}} />
          </div>

          {/* Negocio inteligente - mejorado */}
          <div className="card purpose-block">
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
              <span style={{fontSize:"32px"}}>💰</span>
              <div>
                <h3 style={{margin:0}}>Negocio inteligente</h3>
                <p className="helper-copy" style={{margin:"2px 0 0"}}>Más horas no es más éxito. Mide lo que escala.</p>
              </div>
            </div>
            <div style={{background:"rgba(111,47,75,0.06)",borderRadius:"12px",padding:"16px",marginBottom:"16px"}}>
              <div className="purpose-stat" style={{marginBottom:0}}>
                <span style={{fontSize:"12px"}}>Ingreso por hora trabajada</span>
                <strong style={{fontSize:"32px",color:"var(--purple)",display:"block",margin:"4px 0"}}>{incomePerHour > 0 ? money.format(incomePerHour) : "—"}</strong>
                <small style={{color:"var(--muted)"}}>{incomePerHour > 0 ? "KPI estrella de eficiencia" : "Registra tus horas para ver este dato"}</small>
              </div>
            </div>
            <label className="purpose-field">
              <span>Horas trabajadas esta semana</span>
              <input type="number" min="0" max="80" value={purpose.hoursWorked || 0} onChange={(e) => updatePurpose("hoursWorked", Number(e.target.value))} />
            </label>
            <label className="purpose-field">
              <span>% de ingresos recurrentes (membresías, productos escalables)</span>
              <input type="range" min="0" max="100" value={purpose.recurringIncomePercent || 0} onChange={(e) => updatePurpose("recurringIncomePercent", Number(e.target.value))} />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
                <small>{purpose.recurringIncomePercent || 0}% recurrente</small>
                <small style={{color:purpose.recurringIncomePercent >= 30 ? "var(--green)" : "var(--muted)"}}>{purpose.recurringIncomePercent >= 30 ? "¡Escalando!" : "Meta: 30%+"}</small>
              </div>
            </label>
          </div>

          {/* Energía - sin cambios */}
          <div className="card purpose-block">
            <h3>⚡ Energía y salud emocional</h3>
            <p className="helper-copy">Si tú te quiebras, todo se cae. Tu energía es un recurso.</p>
            <label className="purpose-field"><span>Nivel de energía hoy</span></label>
            <div className="mood-grid">
              {["alto","medio","bajo"].map((e) => (
                <button type="button" key={e} className={purpose.energy === e ? "selected" : ""} onClick={() => updatePurpose("energy", e)}>{e}</button>
              ))}
            </div>
            <label className="purpose-field"><span>Ánimo general</span></label>
            <div className="mood-grid">
              {["abrumada","inspirada","feliz","controladora","cansada"].map((mood) => (
                <button type="button" key={mood} className={purpose.mood === mood ? "selected" : ""} onClick={() => updatePurpose("mood", mood)}>{mood}</button>
              ))}
            </div>
            <p className="helper-copy" style={{marginTop:"10px"}}>{mentalAdvice}</p>
            <div className="selfcare-checks">
              {[["water","Bebí agua"],["walk","Caminé 10 min"],["silence","Tuve silencio"],["devotional","Devocional / oración"]].map(([key, label]) => (
                <label key={key} className="task-row">
                  <input type="checkbox" checked={!!purpose[key]} onChange={(e) => updatePurpose(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <ProgressLabel label="Autocuidado" value={Math.round((selfCareScore / 4) * 100)} tone="green" />
          </div>

          {/* Sistemas - sin cambios */}
          <div className="card purpose-block">
            <h3>🏗️ Autoevaluación de sistemas</h3>
            <p className="helper-copy">No necesitas hacer más, necesitas soltar más. Evalúa una tarea a la vez.</p>
            <SystemsDonut tasks={systemTasks} />
            <div className="carousel-wrap">
              <div className="carousel-header">
                <button type="button" className="carousel-nav" onClick={() => setSystemSlide((s) => Math.max(0, s - 1))} disabled={systemSlide === 0}>←</button>
                <span className="carousel-counter">{systemSlide + 1} de {systemTasks.length}</span>
                <button type="button" className="carousel-nav" onClick={() => setSystemSlide((s) => Math.min(systemTasks.length - 1, s + 1))} disabled={systemSlide === systemTasks.length - 1}>→</button>
              </div>
              {(() => {
                const task = systemTasks[systemSlide];
                const suggestion = task ? systemSuggestions[task.title] : null;
                return task ? (
                  <div className="carousel-card">
                    <span className={`system-cat system-cat-${task.category}`}>{task.category}</span>
                    <h4>{task.title}</h4>
                    <div className="system-modes">
                      {task.canDelegate ? (
                        <>
                          <button type="button" className={task.mode === "manual" ? "mode-btn active-manual" : "mode-btn"} onClick={() => setSystemTasks((c) => c.map((t) => t.id === task.id ? { ...t, mode: "manual" } : t))}>🔴 Lo hago yo</button>
                          <button type="button" className={task.mode === "delegado" ? "mode-btn active-delegado" : "mode-btn"} onClick={() => setSystemTasks((c) => c.map((t) => t.id === task.id ? { ...t, mode: "delegado" } : t))}>🟡 Lo delego</button>
                          <button type="button" className={task.mode === "automatizado" ? "mode-btn active-auto" : "mode-btn"} onClick={() => setSystemTasks((c) => c.map((t) => t.id === task.id ? { ...t, mode: "automatizado" } : t))}>🟢 Automatizado</button>
                        </>
                      ) : (
                        <span className="mode-btn mode-protect">💛 Presencia materna — no se delega</span>
                      )}
                    </div>
                    {task.mode === "manual" && suggestion && (
                      <div className="system-suggestion">
                        {suggestion.protect ? (
                          <p>📌 {suggestion.protect}</p>
                        ) : (
                          <>
                            {suggestion.auto && <p>⚡ <strong>Automatizar:</strong> {suggestion.auto}</p>}
                            {suggestion.delegate && <p>🤝 <strong>Delegar:</strong> {suggestion.delegate}</p>}
                            <a href="https://www.umpacademy.co/membresia" target="_blank" rel="noreferrer" className="ump-link">🎓 Aprende cómo en UMP Academy →</a>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <form className="source-form" style={{marginTop:"12px"}} onSubmit={(e) => { e.preventDefault(); if (!newSystemTask.trim()) return; setSystemTasks((c) => [...c, { id: Date.now(), title: newSystemTask.trim(), category: "negocio", mode: "manual", canDelegate: true }]); setNewSystemTask(""); setSystemSlide(systemTasks.length); }}>
                <input placeholder="Agregar mi propia tarea..." value={newSystemTask} onChange={(e) => setNewSystemTask(e.target.value)} />
                <button className="primary-button" type="submit">+</button>
              </form>
            </div>
          </div>

          {/* Propósito e impacto - mejorado */}
          <div className="card purpose-block purpose-block-wide">
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
              <span style={{fontSize:"32px"}}>🎯</span>
              <div>
                <h3 style={{margin:0}}>Propósito e impacto</h3>
                <p className="helper-copy" style={{margin:"2px 0 0"}}>5 clientes transformados > 5.000 vistas vacías.</p>
              </div>
            </div>
            <div className="purpose-impact-grid">
              <div style={{background:"rgba(201,169,110,0.1)",borderRadius:"12px",padding:"20px",textAlign:"center"}}>
                <label className="purpose-field" style={{marginBottom:0}}>
                  <span style={{fontSize:"13px",fontWeight:700}}>Clientes impactados esta semana</span>
                  <div className="counter-row" style={{marginTop:"12px"}}>
                    <button type="button" onClick={() => updatePurpose("clientsImpacted", Math.max(0, (purpose.clientsImpacted || 0) - 1))}>-</button>
                    <strong style={{fontSize:"36px",color:"var(--orange)"}}>{purpose.clientsImpacted || 0}</strong>
                    <button type="button" onClick={() => updatePurpose("clientsImpacted", (purpose.clientsImpacted || 0) + 1)}>+</button>
                  </div>
                  <small style={{display:"block",marginTop:"8px",color:"var(--muted)"}}>Impacto real medible</small>
                </label>
              </div>
              <label className="purpose-field">
                <span>Nivel de pasión al crear / trabajar</span>
                <div className="passion-stars" style={{marginTop:"8px"}}>
                  {[1,2,3,4,5].map((n) => (
                    <button type="button" key={n} className={n <= (purpose.passionLevel || 3) ? "star active" : "star"} onClick={() => updatePurpose("passionLevel", n)}>★</button>
                  ))}
                </div>
                <small style={{display:"block",textAlign:"center",marginTop:"6px",color:"var(--muted)"}}>{purpose.passionLevel || 3} de 5 estrellas</small>
              </label>
              <label className="purpose-field">
                <span>Testimonio o transformación de esta semana</span>
                <textarea className="purpose-textarea" placeholder="¿Qué cambió en un cliente gracias a tu trabajo?" value={purpose.weekTestimony || ""} onChange={(e) => updatePurpose("weekTestimony", e.target.value)} style={{minHeight:"100px"}} />
              </label>
              <label className="purpose-field">
                <span>Claridad de visión — ¿sabes hacia dónde vas?</span>
                <textarea className="purpose-textarea" placeholder="Mi visión esta semana es..." value={purpose.visionClarity || ""} onChange={(e) => updatePurpose("visionClarity", e.target.value)} style={{minHeight:"100px"}} />
              </label>
            </div>
          </div>

        </div>
      </section>
    );
  }
