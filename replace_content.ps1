$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8
$start = $c.IndexOf('  function renderContent()')
$end = $c.IndexOf('  function renderHome()')

$newFunc = @'
  function renderContent() {
    const unpublished = contentItems.filter((i) => i.status !== "Publicado").length;
    const byNetwork = contentItems.reduce((acc, i) => { acc[i.network] = (acc[i.network] || 0) + 1; return acc; }, {});
    const topNetwork = Object.entries(byNetwork).sort((a, b) => b[1] - a[1])[0];
    const publishedThisWeek = contentItems.filter((i) => i.status === "Publicado" && i.week === "Semana 1").length;
    const lastPublished = contentItems.filter((i) => i.status === "Publicado" && i.createdAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    const daysSincePublish = lastPublished ? Math.floor((Date.now() - lastPublished.createdAt) / 86400000) : null;
    const oldPending = contentItems.filter((i) => i.status === "Por hacer" && i.createdAt && Math.floor((Date.now() - i.createdAt) / 86400000) > 7);
    const goalColors = { "Vender": "var(--green)", "Educar": "var(--pink)", "Conectar": "var(--orange)", "Entretener": "#8a7f7a" };
    const [contentFilter, setContentFilter] = React.useState("");

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Contenido</h2>
          <p>{publishedContent} publicadas - {contentItems.length} piezas en pipeline</p>
        </div>

        {/* KPIs */}
        <div className="content-kpi-row">
          <div className="client-kpi">
            <span>Publicadas</span>
            <strong style={{color:"var(--green)"}}>{publishedContent}</strong>
            <small>piezas listas</small>
          </div>
          <div className="client-kpi">
            <span>Pendientes</span>
            <strong style={{color:"var(--orange)"}}>{unpublished}</strong>
            <small>por mover</small>
          </div>
          <div className="client-kpi">
            <span>Red principal</span>
            <strong style={{fontSize:"13px"}}>{topNetwork ? topNetwork[0] : "-"}</strong>
            <small>{topNetwork ? `${topNetwork[1]} piezas` : "sin datos"}</small>
          </div>
          <div className="client-kpi">
            <span>Consistencia</span>
            <strong style={{color: publishedContent >= 3 ? "var(--green)" : "var(--orange)"}}>{publishedContent >= 3 ? "Buena" : publishedContent >= 1 ? "Regular" : "Baja"}</strong>
            <small>{publishedContent} publicadas</small>
          </div>
        </div>

        {/* Alertas */}
        <div className="content-alerts">
          {publishedContent >= 3 && (
            <div className="alert-banner" style={{background:"var(--green-soft)",border:"1px solid var(--green)",color:"#1a5c3a"}}>
              Excelente consistencia esta semana! Llevas {publishedContent} piezas publicadas. Sigue asi.
            </div>
          )}
          {daysSincePublish !== null && daysSincePublish > 3 && (
            <div className="alert-banner alert-orange">
              Llevas {daysSincePublish} dias sin publicar. Tu audiencia te extrana - una pieza simple hoy vale mas que la perfeccion manana.
            </div>
          )}
          {daysSincePublish === null && contentItems.length === 0 && (
            <div className="alert-banner alert-orange">
              Aun no tienes contenido registrado. Empieza con una pieza simple que venda, no con perfeccion.
            </div>
          )}
          {oldPending.length > 0 && (
            <div className="alert-banner alert-red">
              Tienes {oldPending.length} pieza{oldPending.length > 1 ? "s" : ""} en "Por hacer" desde hace mas de 7 dias: {oldPending.map((i) => i.title).join(", ")}. Muevelas o eliminalas.
            </div>
          )}
        </div>

        {/* Layout principal */}
        <div className="content-main-layout">

          {/* Formulario */}
          <form className="card content-form-card" onSubmit={addContent}>
            <h3>Nueva pieza</h3>
            <input placeholder="Titulo del contenido" value={contentForm.title} onChange={(e) => updateContentForm("title", e.target.value)} required />
            <input placeholder="Hook - primera frase que engancha" value={contentForm.hook} onChange={(e) => updateContentForm("hook", e.target.value)} />
            <label style={{fontSize:"12px",color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>
              Objetivo
              <select value={contentForm.goal} onChange={(e) => updateContentForm("goal", e.target.value)} style={{marginTop:"4px"}}>
                <option>Vender</option>
                <option>Educar</option>
                <option>Conectar</option>
                <option>Entretener</option>
              </select>
            </label>
            <select value={contentForm.format} onChange={(e) => updateContentForm("format", e.target.value)}>
              <option>Reel</option><option>Historia</option><option>Post</option><option>Carrusel</option><option>Foto</option><option>Articulo</option><option>Episodio</option>
            </select>
            <select value={contentForm.network} onChange={(e) => updateContentForm("network", e.target.value)}>
              <option>Instagram</option><option>YouTube</option><option>Spotify</option><option>TikTok</option><option>Website</option><option>Otra</option>
            </select>
            {contentForm.network === "Otra" && <input placeholder="Cual red social" value={contentForm.customNetwork} onChange={(e) => updateContentForm("customNetwork", e.target.value)} />}
            <select value={contentForm.week} onChange={(e) => updateContentForm("week", e.target.value)}>
              <option>Semana 1</option><option>Semana 2</option><option>Semana 3</option><option>Semana 4</option>
            </select>
            <select value={contentForm.status} onChange={(e) => updateContentForm("status", e.target.value)}>
              <option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option>
            </select>
            <button className="primary-button" type="submit">Guardar pieza</button>
          </form>

          {/* Tabla de contenido */}
          <div className="content-table-wrap">
            <div className="content-filter-bar">
              <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className="content-filter-select">
                <option value="">Todas las redes</option>
                <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Spotify</option><option>Website</option>
              </select>
            </div>
            {["Semana 1", "Semana 2", "Semana 3", "Semana 4"].map((week) => {
              const items = contentItems.filter((i) => i.week === week && (contentFilter === "" || i.network === contentFilter));
              if (items.length === 0) return null;
              return (
                <div className="content-week-block card" key={week}>
                  <h4>{week}</h4>
                  {items.map((item) => (
                    <div className="content-row-new" key={item.id}>
                      <div className="content-row-info">
                        <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                          <strong>{item.title}</strong>
                          {item.goal && <span className="content-goal-badge" style={{background: goalColors[item.goal] || "var(--muted)", opacity:0.85}}>{item.goal}</span>}
                        </div>
                        {item.hook && <p className="content-hook">{item.hook}</p>}
                        <small>{item.format} - {item.network}</small>
                      </div>
                      <div className="content-row-actions">
                        <select value={item.status} onChange={(e) => updateContentStatus(item.id, e.target.value)}>
                          <option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option>
                        </select>
                        <button type="button" className="row-delete" onClick={() => confirmDelete("Eliminar?", () => setContentItems((c) => c.filter((ci) => ci.id !== item.id)))}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {contentItems.length === 0 && <p className="helper-copy" style={{padding:"20px 0"}}>Agrega tu primera pieza de contenido para empezar.</p>}
          </div>
        </div>
      </section>
    );
  }

'@

$result = $c.Substring(0, $start) + $newFunc + $c.Substring($end)
Set-Content $f $result -Encoding UTF8
Write-Host "OK"
