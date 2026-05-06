$f = 'src\App.jsx'
$c = Get-Content $f -Raw -Encoding UTF8
$start = $c.IndexOf('  function renderBusiness()')
$end = $c.IndexOf('  function renderClients()')

$newFunc = @'
  function renderBusiness() {
    const healthScore = totals.profit >= 0 && monthlyProgress >= 75 ? "green"
      : totals.profit >= 0 || monthlyProgress >= 50 ? "orange" : "red";
    const healthLabel = healthScore === "green" ? "🟢 Negocio saludable"
      : healthScore === "orange" ? "🟡 Atención requerida" : "🔴 Alerta financiera";
    const healthMsg = healthScore === "green"
      ? "Tus ingresos superan tus gastos y vas bien hacia tu meta."
      : healthScore === "orange"
        ? "Hay margen pero necesitas acelerar ventas o reducir gastos."
        : "Tus gastos superan tus ingresos. Prioriza cobros y reduce gastos no esenciales hoy.";
    const incomeBySource = incomeSources.map((src) => {
      const actual = movements.filter((m) => m.type === "income" && m.classification === src.name).reduce((sum, m) => sum + m.amount, 0);
      const progress = src.monthlyGoal > 0 ? Math.min(Math.round((actual / src.monthlyGoal) * 100), 100) : 0;
      return { ...src, actual, progress };
    });
    const fixedExpensesTotal = movements.filter((m) => m.type === "expense" && m.classification === "Gasto fijo").reduce((sum, m) => sum + m.amount, 0);
    const cashFlow = totals.income - fixedExpensesTotal;
    const cashFlowScore = cashFlow > 0 ? "green" : "red";
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Negocio</h2>
          <p>{profileSetup?.businessName || "Tu negocio"} • {profileSetup?.stage || ""}</p>
        </div>

        <div className="business-top-grid">
          <div className={`health-banner health-${healthScore}`}>
            <strong>{healthLabel}</strong>
            <p>{healthMsg}</p>
            <div className="health-stats">
              <span>Ingresos: <b>{money.format(totals.income)}</b></span>
              <span>Gastos: <b>{money.format(totals.expenses)}</b></span>
              <span>Utilidad: <b>{money.format(totals.profit)}</b></span>
              <span>Meta: <b>{monthlyProgress}%</b></span>
            </div>
          </div>
          <div className={`cashflow-card cashflow-${cashFlowScore}`}>
            <div className="cashflow-label">Flujo de caja del mes</div>
            <div className="cashflow-amount">{money.format(cashFlow)}</div>
            <div className="cashflow-detail">
              <span>Ingresos <b>{money.format(totals.income)}</b></span>
              <span>Gastos fijos <b>{money.format(fixedExpensesTotal)}</b></span>
            </div>
            <p className="helper-copy">{cashFlow >= 0 ? "Tienes margen positivo este mes. Cuida los gastos variables." : "Tus gastos fijos superan tus ingresos. Revisa qué puedes reducir."}</p>
          </div>
        </div>

        <div className="business-movements-grid">
          <div className="card">{MovementForm()}</div>
          <div className="card movement-detail-card">
            <div className="movement-detail-header">
              <div><h3>Movimientos</h3><p className="helper-copy">Tus últimos registros.</p></div>
              <div className="export-buttons">
                <button type="button" onClick={exportMovementsToExcel}>Excel</button>
                <button type="button" onClick={exportMovementsToPdf}>PDF</button>
              </div>
            </div>
            {MovementList({ compact: true })}
          </div>
        </div>

        <div className="business-sources-grid">
          <div className="card">
            <h3>Fuentes de ingreso</h3>
            <p className="helper-copy">Define tus fuentes y metas mensuales.</p>
            {incomeBySource.map((src) => (
              <div className="source-row" key={src.id}>
                <div className="source-info">
                  <strong>{src.name}</strong>
                  <small>{money.format(src.actual)} de {money.format(src.monthlyGoal)} meta</small>
                </div>
                <div className="source-right">
                  <Progress value={src.progress} tone={src.color} />
                  <small>{src.progress}%</small>
                  <input type="number" min="0" value={src.monthlyGoal} onChange={(e) => setIncomeSources((c) => c.map((s) => s.id === src.id ? { ...s, monthlyGoal: Number(e.target.value) } : s))} />
                  <button type="button" className="row-delete" onClick={() => confirmDelete("¿Eliminar?", () => setIncomeSources((c) => c.filter((s) => s.id !== src.id)))}>×</button>
                </div>
              </div>
            ))}
            <form className="source-form" onSubmit={(e) => { e.preventDefault(); if (!incomeSourceForm.name.trim()) return; setIncomeSources((c) => [...c, { id: Date.now(), name: incomeSourceForm.name.trim(), monthlyGoal: Number(incomeSourceForm.monthlyGoal) || 0, color: "purple" }]); setIncomeSourceForm({ name: "", monthlyGoal: "" }); }}>
              <input placeholder="Nombre de la fuente" value={incomeSourceForm.name} onChange={(e) => setIncomeSourceForm((c) => ({ ...c, name: e.target.value }))} />
              <input type="number" min="0" placeholder="Meta mensual" value={incomeSourceForm.monthlyGoal} onChange={(e) => setIncomeSourceForm((c) => ({ ...c, monthlyGoal: e.target.value }))} />
              <button className="primary-button" type="submit">Agregar</button>
            </form>
          </div>
          <div className="card insight-card">
            <h3>Lectura CEO</h3>
            <p className="helper-copy">Análisis inteligente de tu situación actual.</p>
            {insights.map((insight) => <p key={insight} style={{borderLeft:"3px solid var(--pink)",paddingLeft:"12px",margin:"8px 0"}}>{insight}</p>)}
          </div>
        </div>

        <div className="business-panel-row">
          {ReinvestmentCard()}
          <div>{BanksCard()}</div>
        </div>

        <div className="annual-budget-card card">
          <div className="budget-head">
            <div><h3>Presupuesto anual</h3><p>Planifica mes a mes.</p></div>
            <div className="budget-total"><span>Utilidad anual estimada</span><strong>{money.format(annualProfit)}</strong></div>
          </div>
          <div className="budget-table">
            <div className="budget-row budget-header"><span>Mes</span><span>Ingresos</span><span>Gastos fijos</span><span>Gastos variables</span><span>Fees</span><span>Utilidad</span></div>
            {annualBudget.map((row) => {
              const profit = Number(row.income||0)-Number(row.fixedExpenses||0)-Number(row.variableExpenses||0)-Number(row.platformFees||0);
              return (
                <div className="budget-row" key={row.month}>
                  <strong>{row.month}</strong>
                  <input type="number" min="0" value={row.income} onChange={(e) => updateAnnualBudget(row.month,"income",e.target.value)} />
                  <input type="number" min="0" value={row.fixedExpenses} onChange={(e) => updateAnnualBudget(row.month,"fixedExpenses",e.target.value)} />
                  <input type="number" min="0" value={row.variableExpenses} onChange={(e) => updateAnnualBudget(row.month,"variableExpenses",e.target.value)} />
                  <input type="number" min="0" value={row.platformFees} onChange={(e) => updateAnnualBudget(row.month,"platformFees",e.target.value)} />
                  <b style={{color: profit >= 0 ? "var(--green)" : "var(--pink)"}}>{money.format(profit)}</b>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
  
'@

$result = $c.Substring(0, $start) + $newFunc + $c.Substring($end)
Set-Content $f $result -Encoding UTF8
Write-Host "OK"
