export default function AppLogo({ size = 36, color = '#cdeafd' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <polygon
        points="18,5 34,13 18,21 2,13"
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="13" r="2.8" fill={color} />
      <line x1="34" y1="13" x2="34" y2="22" stroke={color} strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="34" cy="23.5" r="1.8" fill={color} fillOpacity="0.7" />
      <path
        d="M9 18.5v6.5c0 2.2 4 4 9 4s9-1.8 9-4v-6.5"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
