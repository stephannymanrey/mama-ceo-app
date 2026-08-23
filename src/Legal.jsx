import { useState } from "react";
import "./Legal.css";
import { terminosYCondiciones, politicaDePrivacidad, garantias } from "./data/legal";

const DOCUMENTOS = {
  terminos:   { etiqueta: "Términos y Condiciones", secciones: terminosYCondiciones },
  privacidad: { etiqueta: "Política de Privacidad", secciones: politicaDePrivacidad },
  garantias:  { etiqueta: "Garantías",              secciones: garantias             },
};

export default function Legal({ documentoInicial = "terminos", onVolver }) {
  const [doc, setDoc] = useState(documentoInicial);
  const { secciones } = DOCUMENTOS[doc];

  return (
    <section className="panel workspace-panel">
      <div className="legal-tarjeta">
        <button className="legal-volver" onClick={onVolver}>← Volver</button>

        <div className="legal-tabs">
          {Object.entries(DOCUMENTOS).map(([key, { etiqueta }]) => (
            <button
              key={key}
              className={`legal-tab${doc === key ? " legal-tab--activo" : ""}`}
              onClick={() => setDoc(key)}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <h1 className="legal-titulo">{DOCUMENTOS[doc].etiqueta}</h1>

        {secciones.map((s) => (
          <div key={s.titulo} className="legal-seccion">
            <p className="legal-seccion-titulo">{s.titulo}</p>
            <p className="legal-seccion-texto">{s.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
