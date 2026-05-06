$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8
$start = $c.IndexOf('    function renderClients()')
$end = $c.IndexOf('  function renderContent()')

$newFunc = @'
  function renderClients() {
    const stages = ["Lead frio", "Lead tibio", "Lead caliente", "Venta ganada"];
    const alertDays = { "Lead frio": [7, 14], "Lead tibio": [3, 7], "Lead caliente": [1, 3], "Venta ganada": [14, 30] };
    const today = Date.now();
    const daysSince = (ts) => ts ? Math.floor((today - ts) / 86400000) : 999;
    const getAlert = (client) => {
      const days = daysSince(client.lastContact);
      const [warn, danger] = alertDays[client.status] || [7, 14];
      if (days >= danger) return "red";
      if (days >= warn) return "yellow";
      return "green";
    };
    const urgentClients = clients.filter((c) => getAlert(c) !== "green" && c.status !== "Venta ganada");
    const urgentSubscriptions = clients.filter((c) => getAlert(c) !== "green" && c.status === "Venta ganada");
    const stageTotal = (stage) => clients.filter((c) => c.status === stage).reduce((sum, c) => sum + (c.amount || 0), 0);
    const paidClients = clients.filter((c) => c.status === "Venta ganada");
    const pipelineTotal = clients.filter((c) => c.status !== "Venta ganada").reduce((sum, c) => sum + (c.amount || 0), 0);
    const priorityClient = [...clients].filter((c) => c.status !== "Venta ganada").sort((a, b) => {
      const stageScore = { "Lead caliente": 3, "Lead tibio": 2, "Lead frio": 1 };
      return ((stageScore[b.status] || 0) * 100 + daysSince(b.lastContact)) - ((stageScore[a.status] || 0) * 100 + daysSince(a.lastContact));
    })[0];
    const totalLeads = clients.length;
    const totalWon = clients.filter((c) => c.status === "Venta ganada").length;
    const conversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;
    const closedWithDates = clients.filter((c) => c.status === "Venta ganada" && c.createdAt && c.lastContact);
    const avgCloseDays = closedWithDates.length > 0
      ? Math.round(closedWithDates.reduce((sum, c) => sum + Math.floor((c.lastContact - c.createdAt) / 86400000), 0) / closedWithDates.length)
      : null;
    const sourceCounts = clients.reduce((acc, c) => { const src = c.source || "Sin fuente"; acc[src] = (acc[src] || 0) + 1; return acc; }, {});
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
    const defaultSources = ["Instagram", "Referido", "Contenido / Reel", "WhatsApp", "TikTok", "Email", "Otra"];
    const filteredClients = (stage) => clients.filter((c) => c.status === stage && (clientSearch === "" || c.name.toLowerCase().includes(clientSearch.toLowerCase())));

    const waMsg = (client) => {
      const msgs = {
        "Lead frio": `Hola ${client.name}! Noo queria dejar nuestra conversacion en el aire. Aqui estoy para retomarla cuando sea un buen momento para ti. Sigues interesada en ${client.service}?`,
        "Lead tibio": `Hola ${client.name}! Pense en ti hoy. No queria que nuestra conversacion quedara pendiente. Que ha sido lo que te ha frenado para dar el siguiente paso?`,
        "Lead caliente": `Hola ${client.name}! Queria retomar lo que conversamos sobre ${client.service}. Tienes 5 minutos hoy para que te cuente como podemos empezar?`,
        "Venta ganada": `Hola ${client.name}! Solo queria saber como vas con ${client.service}. Que resultado has notado hasta ahora?`
      };
      return encodeURIComponent(msgs[client.status] || `Hola ${client.name}, queria hacer seguimiento sobre ${client.service}.`);
    };

    const waLink = (client) => {
      const msg = waMsg(client);
      return client.phone ? `https://wa.me/${client.phone.replace(/\D/g,"")}?text=${msg}` : `https://wa.me/?text=${msg}`;
    };

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Clientes</h2>
          <p>{activeClients} activas • {money.format(wonSalesTotal)} en ventas cerradas</p>
        </div>

        {/* KPIs */}
        <div className="clients-kpi-row">
          {stages.map((stage) => (
            <div className="client-kpi" key={stage}>
              <span>{stage}</span>
              <strong>{clients.filter((c) => c.status === stage).length}</strong>
              <small>{money.format(stageTotal(stage))}</small>
            </div>
          ))}
          <div className="client-kpi">
            <span>Pipeline total</span>
            <strong style={{fontSize:"14px"}}>{money.format(pipelineTotal)}</strong>
            <small>potencial en proceso</small>
          </div>
          <div className="client-kpi">
            <span>Conversion</span>
            <strong>{conversionRate}%</strong>
            <small>{totalWon} de {totalLeads}</small>
          </div>
          <div className="client-kpi">
            <span>Cierre promedio</span>
            <strong>{avgCloseDays !== null ? `${avgCloseDays}d` : "-"}</strong>
            <small>{avgCloseDays !== null ? "dias hasta venta" : "sin datos"}</small>
          </div>
          {topSource && (
            <div className="client-kpi">
              <span>Mejor fuente</span>
              <strong style={{fontSize:"13px"}}>{topSource[0]}</strong>
              <small>{topSource[1]} clienta{topSource[1] !== 1 ? "s" : ""}</small>
            </div>
          )}
        </div>

        {/* Accion del dia */}
        {priorityClient && (
          <div className="action-day-banner">
            <div className="action-day-left">
              <span className="action-day-label">Accion del dia</span>
              <strong>{priorityClient.name}</strong>
              <span>{priorityClient.status} • {money.format(priorityClient.amount)} • hace {daysSince(priorityClient.lastContact)} dias sin contacto</span>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
                <button type="button" className="contact-today-btn" style={{width:"auto",padding:"0 14px"}} onClick={() => logContact(priorityClient.id, priorityClient.name)}>Contacte hoy</button>
                <a href={waLink(priorityClient)} target="_blank" rel="noreferrer"
                  style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"0 14px",minHeight:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"12px",fontWeight:700,textDecoration:"none"}}>
                  WhatsApp
                </a>
              </div>
            </div>
            <div className="action-day-right">
              <p>{priorityClient.nextAction || "Hacer seguimiento"}</p>
              <div style={{marginTop:"8px",textAlign:"center"}}>
                <strong style={{fontSize:"28px",color:"var(--green)",display:"block",lineHeight:1}}>{contactsThisWeek}</strong>
                <small style={{color:"var(--muted)",fontSize:"11px",textTransform:"uppercase",fontWeight:800}}>contactos esta semana</small>
                <small style={{color:"var(--green)",fontSize:"11px",fontWeight:700}}>{contactsThisWeek >= 5 ? "excelente ritmo" : contactsThisWeek >= 3 ? "buen avance" : "meta: 5+"}</small>
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {(urgentClients.length > 0 || urgentSubscriptions.length > 0) && (
          <div className="client-alerts">
            {urgentClients.length > 0 && (
              <div className="alert-banner alert-orange">
                <strong>{urgentClients.length} lead{urgentClients.length > 1 ? "s" : ""} sin contacto:</strong> {urgentClients.map((c) => c.name).join(", ")} — actuas hoy o se enfriaran.
              </div>
            )}
            {urgentSubscriptions.length > 0 && (
              <div className="alert-banner alert-red">
                <strong>{urgentSubscriptions.length} clienta{urgentSubscriptions.length > 1 ? "s" : ""} sin seguimiento:</strong> {urgentSubscriptions.map((c) => c.name).join(", ")} — riesgo de perder la relacion.
              </div>
            )}
          </div>
        )}

        {/* Layout: formulario + pipeline */}
        <div className="clients-main-layout">

          {/* Formulario nueva clienta */}
          <form className="card clients-form-card" onSubmit={addClient}>
            <h3>Nueva clienta</h3>
            <input placeholder="Nombre" value={clientForm.name} onChange={(e) => updateClientForm("name", e.target.value)} required />
            <input placeholder="Servicio o producto" value={clientForm.service} onChange={(e) => updateClientForm("service", e.target.value)} required />
            <input placeholder="Telefono (ej: 573001234567)" value={clientForm.phone} onChange={(e) => updateClientForm("phone", e.target.value)} />
            <select value={clientForm.status} onChange={(e) => updateClientForm("status", e.target.value)}>
              {stages.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input placeholder="Proxima accion" value={clientForm.nextAction} onChange={(e) => updateClientForm("nextAction", e.target.value)} />
            <input placeholder="Monto potencial" type="number" min="0" value={clientForm.amount} onChange={(e) => updateClientForm("amount", e.target.value)} required />
            <select value={clientForm.source} onChange={(e) => updateClientForm("source", e.target.value)}>
              <option value="">De donde llego?</option>
              {defaultSources.map((s) => <option key={s}>{s}</option>)}
            </select>
            {clientForm.source === "Otra" && (
              <input placeholder="Cual fuente?" value={clientForm.customSource} onChange={(e) => updateClientForm("customSource", e.target.value)} />
            )}
            <button className="primary-button" type="submit">Guardar clienta</button>
          </form>

          {/* Pipeline */}
          <div className="clients-pipeline-wrap">
            <div className="clients-search-bar">
              <input placeholder="Buscar clienta por nombre..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="clients-search-input" />
            </div>
            <div className="pipeline-board">
              {stages.map((stage) => (
                <div className="pipeline-column" key={stage}>
                  <div className="pipeline-col-header">
                    <h3>{stage}</h3>
                    <small>{money.format(stageTotal(stage))}</small>
                  </div>
                  {filteredClients(stage).map((client) => {
                    const alert = getAlert(client);
                    const days = daysSince(client.lastContact);
                    return (
                      <div className={`lead-card lead-alert-${alert}`} key={client.id}>
                        <div className="lead-card-top">
                          <strong>{client.name}</strong>
                          <span className={`alert-dot alert-dot-${alert}`}></span>
                        </div>
                        <small>{client.service} • {money.format(client.amount)}</small>
                        {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>{client.source}</small>}
                        <p>{client.nextAction || "Hacer seguimiento"}</p>
                        <small className="last-contact">
                          {client.lastContact ? `Hace ${days} dia${days !== 1 ? "s" : ""}` : "Sin contacto"}
                        </small>
                        <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
                          <button type="button" className="contact-today-btn" style={{flex:1}} onClick={() => logContact(client.id, client.name)}>Contacte hoy</button>
                          <a href={waLink(client)} target="_blank" rel="noreferrer"
                            style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"36px",height:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"16px",textDecoration:"none",flexShrink:0}}>
                            W
                          </a>
                        </div>
                        <div className="lead-stage-btns">
                          {stages.filter((s) => s !== stage).map((s) => (
                            <button type="button" key={s} onClick={() => moveClientStatus(client.id, s)}>{s.replace("Lead ", "")}</button>
                          ))}
                          <button type="button" className="delete-btn" onClick={() => confirmDelete("Eliminar?", () => setClients((c) => c.filter((cl) => cl.id !== client.id)))}>x</button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredClients(stage).length === 0 && (
                    <p style={{fontSize:"12px",color:"var(--muted)",textAlign:"center",padding:"12px 0"}}>Sin clientas aqui</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clientas que pagaron */}
        <div className="paid-clients-section card">
          <div className="section-title compact-title">
            <h2>Clientas que ya pagaron</h2>
            <p>Cuida la experiencia, fomenta la recompra y los referidos.</p>
          </div>
          {paidClients.length === 0 && <p className="helper-copy">Aun no tienes ventas cerradas registradas.</p>}
          <div className="paid-client-grid">
            {paidClients.map((client) => (
              <article className="paid-client-card" key={client.id}>
                <div className="paid-client-header">
                  <div>
                    <strong>{client.name}</strong>
                    <small>{client.service} • {money.format(client.amount)}</small>
                  </div>
                  <span className={`alert-dot alert-dot-${getAlert(client)}`}></span>
                </div>
                {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>{client.source}</small>}
                <small className="last-contact">{client.lastContact ? `Ultimo contacto: hace ${daysSince(client.lastContact)} dias` : "Sin contacto registrado"}</small>
                <div style={{display:"flex",gap:"6px"}}>
                  <button type="button" className="contact-today-btn" style={{flex:1}} onClick={() => logContact(client.id, client.name)}>Contacte hoy</button>
                  <a href={waLink(client)} target="_blank" rel="noreferrer"
                    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"36px",height:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"16px",textDecoration:"none",flexShrink:0}}>
                    W
                  </a>
                </div>
                <textarea placeholder="Notas de seguimiento, entrega, resultados o proxima recompra..." value={client.notes || ""} onChange={(e) => updateClientNotes(client.id, e.target.value)} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

'@

$result = $c.Substring(0, $start) + $newFunc + $c.Substring($end)
Set-Content $f $result -Encoding UTF8
Write-Host "OK"
