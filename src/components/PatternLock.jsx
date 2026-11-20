import { Lock, Delete, RotateCcw } from 'lucide-react';

// Coordenadas (x, y) de los 9 puntos en la cuadrícula 3x3
const PUNTOS = [
  { id: 1, x: 30, y: 30 },
  { id: 2, x: 100, y: 30 },
  { id: 3, x: 170, y: 30 },
  { id: 4, x: 30, y: 100 },
  { id: 5, x: 100, y: 100 },
  { id: 6, x: 170, y: 100 },
  { id: 7, x: 30, y: 170 },
  { id: 8, x: 100, y: 170 },
  { id: 9, x: 170, y: 170 },
];

export default function PatternLock({ tipoBloqueo, codigoBloqueo, onUpdate }) {
  // Convierte el texto "1-2-5-8" en una lista de números [1, 2, 5, 8]
  const secuencia =
    tipoBloqueo === 'PATRON' && codigoBloqueo
      ? codigoBloqueo.split('-').map(Number)
      : [];

  const handlePuntoClick = (id) => {
    if (secuencia.includes(id)) return; // Evita repetir el mismo punto
    const nuevaSecuencia = [...secuencia, id];
    onUpdate('PATRON', nuevaSecuencia.join('-'));
  };

  const handleTeclaPin = (digito) => {
    const actual = tipoBloqueo === 'PIN' ? codigoBloqueo : '';
    if (actual.length >= 12) return;
    onUpdate('PIN', actual + digito);
  };

  const handleBorrarPin = () => {
    const actual = tipoBloqueo === 'PIN' ? codigoBloqueo : '';
    onUpdate('PIN', actual.slice(0, -1));
  };

  const handleLimpiar = () => {
    onUpdate(tipoBloqueo, '');
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Patrón / PIN de Desbloqueo
        </h3>
        <button
          type="button"
          onClick={handleLimpiar}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Limpiar
        </button>
      </div>

      {/* Selector de pestañas: Patrón vs PIN */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-4">
        <button
          type="button"
          onClick={() => onUpdate('PATRON', tipoBloqueo === 'PATRON' ? codigoBloqueo : '')}
          className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            tipoBloqueo === 'PATRON'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Patrón (3×3)
        </button>
        <button
          type="button"
          onClick={() => onUpdate('PIN', tipoBloqueo === 'PIN' ? codigoBloqueo : '')}
          className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            tipoBloqueo === 'PIN'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          PIN / Clave
        </button>
      </div>

      {/* MODO PATRÓN */}
      {tipoBloqueo === 'PATRON' ? (
        <div className="flex flex-col items-center">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <svg width="200" height="200" viewBox="0 0 200 200" className="select-none">
              {/* Líneas que conectan los puntos */}
              {secuencia.map((puntoId, index) => {
                if (index === 0) return null;
                const origen = PUNTOS.find((p) => p.id === secuencia[index - 1]);
                const destino = PUNTOS.find((p) => p.id === puntoId);
                return (
                  <line
                    key={`${origen.id}-${destino.id}`}
                    x1={origen.x}
                    y1={origen.y}
                    x2={destino.x}
                    y2={destino.y}
                    stroke="#22d3ee"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Los 9 círculos interactivos */}
              {PUNTOS.map((punto) => {
                const ordenIndex = secuencia.indexOf(punto.id);
                const activo = ordenIndex !== -1;
                return (
                  <g
                    key={punto.id}
                    onClick={() => handlePuntoClick(punto.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={punto.x}
                      cy={punto.y}
                      r={activo ? 18 : 14}
                      fill={activo ? '#0891b2' : '#1e293b'}
                      stroke={activo ? '#67e8f9' : '#475569'}
                      strokeWidth="2.5"
                    />
                    <text
                      x={punto.x}
                      y={punto.y + 5}
                      textAnchor="middle"
                      fill={activo ? '#ffffff' : '#94a3b8'}
                      fontSize="13"
                      fontWeight="bold"
                    >
                      {activo ? ordenIndex + 1 : punto.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Secuencia:{' '}
            <span className="text-cyan-400 font-mono font-bold">
              {codigoBloqueo || 'Haz clic en los puntos en orden'}
            </span>
          </p>
        </div>
      ) : (
        /* MODO PIN */
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Escribe o marca el PIN..."
            value={codigoBloqueo}
            onChange={(e) => onUpdate('PIN', e.target.value)}
            className="w-full text-center font-mono text-lg tracking-widest bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
          />
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleTeclaPin(num)}
                className="py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-sm transition cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLimpiar}
              className="py-2.5 rounded-lg bg-slate-950 hover:bg-rose-950/50 border border-slate-800 text-rose-400 font-medium text-xs transition cursor-pointer"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => handleTeclaPin('0')}
              className="py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-sm transition cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBorrarPin}
              className="py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}