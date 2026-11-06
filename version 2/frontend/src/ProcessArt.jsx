import React from 'react';

export function ProcessArt({ step }) {
 return <svg className="process-diagram" viewBox="0 0 280 120" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
  {step === 0 ? <>
   {[20, 40, 60, 80, 100].map((y, index) => <g key={y}><path d={`M${30 + Math.abs(index - 2) * 10} ${y} L145 60`} opacity=".5"/><circle cx={30 + Math.abs(index - 2) * 10} cy={y} r="3" fill="currentColor" stroke="none" opacity=".6"/></g>)}
   <circle cx="145" cy="60" r="24" opacity=".7"/><circle className="diagram-beacon" cx="145" cy="60" r="5" fill="currentColor"/><path d="M150 60H245m-8-7 8 7-8 7" opacity=".8"/>
  </> : step === 1 ? <>
   <rect x="28" y="18" width="54" height="39" rx="5" opacity=".7"/><rect x="58" y="66" width="32" height="31" rx="4" opacity=".6"/>
   <path d="M108 60h40m-8-7 8 7-8 7" opacity=".7"/><rect x="177" y="17" width="70" height="87" rx="6" opacity=".8"/><path d="M190 36h44m-44 11h28m-28 36h44" opacity=".5"/><rect className="diagram-beacon" x="190" y="62" width="44" height="7" fill="currentColor" stroke="none"/>
  </> : <>
   <path d="M24 60h53m126 0h53M94 37a50 50 0 0 1 90-5l-2-19m2 19-20-3M186 83a50 50 0 0 1-90 5l2 19m-2-19 20 3" opacity=".7"/>
   <circle cx="24" cy="60" r="3" fill="currentColor"/><circle cx="256" cy="60" r="3" fill="currentColor"/><circle className="diagram-beacon" cx="140" cy="60" r="7" fill="currentColor" stroke="none"/>
  </>}
 </svg>;
}
