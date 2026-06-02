export default function Logo({ width = 200, className = "" }) {
  const h = Math.round(width * 0.39);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 290 113"
      width={width}
      height={h}
      className={className}
      aria-label="Mamá CEO App"
    >
      <defs>
        <linearGradient id="mc-coral" x1="0%" y1="0%" x2="20%" y2="100%">
          <stop offset="0%" stopColor="#E8755A" />
          <stop offset="100%" stopColor="#C4526A" />
        </linearGradient>
      </defs>

      {/* ── HAIR (behind head) ── */}
      <path d="M37 24 C29 27 23 44 25 66 C26 78 29 90 32 102"
        stroke="#8B6565" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M63 24 C71 27 77 44 75 66 C74 78 71 90 68 102"
        stroke="#8B6565" strokeWidth="2.8" fill="none" strokeLinecap="round" />

      {/* ── HEAD ── */}
      <circle cx="50" cy="19" r="13" fill="#FDEAE0" stroke="url(#mc-coral)" strokeWidth="2.2" />

      {/* ── GLASSES ── */}
      <ellipse cx="44" cy="20" rx="4.5" ry="3.5" fill="none" stroke="#7A5252" strokeWidth="1.4" />
      <ellipse cx="55" cy="20" rx="4.5" ry="3.5" fill="none" stroke="#7A5252" strokeWidth="1.4" />
      <line x1="48.5" y1="20" x2="50.5" y2="20" stroke="#7A5252" strokeWidth="1.4" />
      <line x1="39" y1="19.5" x2="37.5" y2="18.5" stroke="#7A5252" strokeWidth="1.4" />
      <line x1="59.5" y1="19.5" x2="61" y2="18.5" stroke="#7A5252" strokeWidth="1.4" />

      {/* ── NECK ── */}
      <path d="M46 32 L47 40 L53 40 L54 32 Z" fill="#F5C0A5" />

      {/* ── BODY / DRESS ── */}
      <path d="M33 43 C37 40 44 38 50 38 C56 38 63 40 67 43 L72 90 C62 96 56 98 50 98 C44 98 38 96 28 90 Z"
        fill="url(#mc-coral)" opacity="0.87" />

      {/* ── HEART on dress ── */}
      <path d="M50 67 C50 64 47 62 47 65 C47 68 50 71.5 50 71.5 C50 71.5 53 68 53 65 C53 62 50 64 50 67 Z"
        fill="white" opacity="0.8" />

      {/* ── LEFT ARM → child ── */}
      <path d="M34 49 C27 59 20 67 15 76"
        stroke="url(#mc-coral)" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* ── RIGHT ARM → child ── */}
      <path d="M66 49 C73 59 80 67 85 76"
        stroke="url(#mc-coral)" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* ── CHILD LEFT ── */}
      {/* hair */}
      <path d="M4 78 C4 70 20 70 20 78" fill="url(#mc-coral)" opacity="0.55" />
      {/* head */}
      <circle cx="12" cy="82" r="9" fill="#FDEAE0" stroke="url(#mc-coral)" strokeWidth="2" />
      {/* body */}
      <path d="M5 91 Q7 102 12 106 Q17 102 19 91 Q16 89 12 89 Q8 89 5 91 Z"
        fill="url(#mc-coral)" opacity="0.6" />
      {/* arm up to mom */}
      <line x1="17" y1="84" x2="15" y2="76" stroke="url(#mc-coral)" strokeWidth="2" strokeLinecap="round" />

      {/* ── CHILD RIGHT ── */}
      {/* hair */}
      <path d="M80 78 C80 70 96 70 96 78" fill="url(#mc-coral)" opacity="0.55" />
      {/* head */}
      <circle cx="88" cy="82" r="9" fill="#FDEAE0" stroke="url(#mc-coral)" strokeWidth="2" />
      {/* body */}
      <path d="M81 91 Q83 102 88 106 Q93 102 95 91 Q92 89 88 89 Q84 89 81 91 Z"
        fill="url(#mc-coral)" opacity="0.6" />
      {/* arm up to mom */}
      <line x1="83" y1="84" x2="85" y2="76" stroke="url(#mc-coral)" strokeWidth="2" strokeLinecap="round" />

      {/* ── DIVIDER ── */}
      <line x1="107" y1="18" x2="107" y2="102" stroke="rgba(196,82,106,0.15)" strokeWidth="1" />

      {/* ── TEXT: "Mamá" italic ── */}
      <text x="119" y="47"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22" fontStyle="italic" fontWeight="400"
        fill="#8B6565" letterSpacing="0.5">
        Mamá
      </text>

      {/* ── TEXT: "CEO" heavy ── */}
      <text x="116" y="83"
        fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
        fontSize="40" fontWeight="900"
        fill="url(#mc-coral)" letterSpacing="-1">
        CEO
      </text>

      {/* ── TEXT: "APP" small caps ── */}
      <text x="120" y="100"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="10" fontWeight="700"
        fill="#9A7878" letterSpacing="5">
        APP
      </text>
    </svg>
  );
}
