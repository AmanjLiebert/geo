import React from "react";
import styles from "./geological-survey-scene.module.css";

type Props = {
  code: string;
};

export function GeologicalSurveyScene({ code }: Props) {
  return (
    <div className={styles.wrapper} aria-hidden="true">
      <svg
        viewBox="0 0 1000 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.svg}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Desert Sky Gradient */}
          <linearGradient id="geoSky" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5d5c5" />
            <stop offset="45%" stopColor="#fbf0e4" />
            <stop offset="100%" stopColor="#fbf8f1" />
          </linearGradient>

          {/* Headlight Beam Gradient */}
          <linearGradient id="headlightBeam" x1="720" y1="275" x2="1000" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(251, 248, 241, 0.75)" />
            <stop offset="40%" stopColor="rgba(216, 198, 163, 0.35)" />
            <stop offset="100%" stopColor="rgba(216, 198, 163, 0)" />
          </linearGradient>

          {/* Under-bed Strata Gradients */}
          <linearGradient id="strataIron" x1="0" y1="340" x2="0" y2="375" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b4573f" />
            <stop offset="100%" stopColor="#9e4d37" />
          </linearGradient>
          <linearGradient id="strataShale" x1="0" y1="375" x2="0" y2="410" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4c5f56" />
            <stop offset="100%" stopColor="#3a4841" />
          </linearGradient>
        </defs>

        {/* 1. Sky & Sun */}
        <rect width="1000" height="290" fill="url(#geoSky)" />
        <circle cx="820" cy="110" r="48" fill="#fde6d2" opacity="0.6" />
        <circle cx="820" cy="110" r="32" fill="#fff5ea" opacity="0.8" />

        {/* 2. Drifting Desert Clouds */}
        <g className={styles.cloudSlow}>
          <path
            d="M50 70c0-12 10-22 22-22 6 0 12 3 16 7 4-10 14-17 26-17 16 0 29 12 30 28 8 2 14 9 14 17 0 11-9 19-20 19H68c-10 0-18-8-18-18z"
            fill="#ffffff"
            opacity="0.55"
          />
        </g>
        <g className={styles.cloudMid}>
          <path
            d="M380 95c0-9 8-16 17-16 5 0 9 2 12 5 3-7 11-12 20-12 12 0 22 9 23 21 6 1 11 7 11 13 0 8-7 14-15 14h-54c-8 0-14-6-14-13z"
            fill="#ffffff"
            opacity="0.45"
          />
          <path
            d="M740 55c0-10 9-18 19-18 5 0 10 2 14 6 4-8 12-14 22-14 14 0 25 10 26 24 7 1 12 8 12 15 0 9-8 16-17 16h-60c-9 0-16-7-16-15z"
            fill="#ffffff"
            opacity="0.5"
          />
        </g>

        {/* 3. Distant Zagros Fold Mountain Ridges */}
        <g className={styles.mountainLayer}>
          {/* Ridge 1: Far peaks */}
          <polygon
            points="-200,290 -120,200 -40,240 60,170 160,230 280,160 390,225 500,150 620,235 740,165 850,220 960,145 1080,225 1200,160 1320,230 1440,290"
            fill="#c4b59f"
            opacity="0.5"
          />
          {/* Ridge 2: Mid folded strata ridges */}
          <polygon
            points="-200,290 -90,230 20,270 130,210 240,260 360,195 470,250 590,190 710,255 830,200 950,250 1060,185 1190,245 1310,200 1440,290"
            fill="#9baca2"
            opacity="0.65"
          />
        </g>

        {/* 4. Rolling Geological Outcrop & Horizon */}
        <g className={styles.terrainLayer}>
          {/* Layered hill surface */}
          <path
            d="M-200 290 Q-50 260 100 285 T400 280 T700 285 T1000 275 T1300 285 T1600 290 L1600 315 L-200 315 Z"
            fill="#d8c6a3"
          />
          <path
            d="M-200 300 Q-50 285 100 302 T400 298 T700 304 T1000 296 T1300 302 T1600 300 L1600 315 L-200 315 Z"
            fill="#c5b08c"
          />
        </g>

        {/* 5. Surface Rocks & Geological Survey Stakes (Moving Foreground) */}
        <g className={styles.tracksLayer}>
          {/* Geological measuring pegs and small scree rocks */}
          {Array.from({ length: 12 }).map((_, i) => (
            <g key={i} transform={`translate(${i * 110}, 0)`}>
              {/* Survey stake with flag */}
              <line x1="20" y1="285" x2="20" y2="308" stroke="#20231f" strokeWidth="2" />
              <polygon points="20,285 32,290 20,295" fill="#9e4d37" />
              {/* Scree pebble */}
              <polygon points="55,307 62,303 70,306 65,310 57,310" fill="#7f928b" stroke="#20231f" strokeWidth="1" />
              {/* Outcrop crack */}
              <line x1="85" y1="306" x2="98" y2="309" stroke="#20231f" strokeWidth="1.5" strokeDasharray="3,2" />
            </g>
          ))}
        </g>

        {/* 6. Underground Cross-Section Strata (Cutaway) */}
        <g className={styles.strataLayer}>
          {/* Bed 1: Ochre Limestone */}
          <rect x="-200" y="315" width="1600" height="30" fill="#d8c6a3" stroke="#20231f" strokeWidth="1.5" />
          <line x1="-200" y1="328" x2="1400" y2="328" stroke="#20231f" strokeWidth="1" strokeDasharray="14,8" opacity="0.4" />

          {/* Bed 2: Ferruginous Iron Sandstone */}
          <rect x="-200" y="345" width="1600" height="35" fill="url(#strataIron)" stroke="#20231f" strokeWidth="1.5" />
          <line x1="-200" y1="362" x2="1400" y2="362" stroke="#20231f" strokeWidth="1" strokeDasharray="18,10" opacity="0.3" />

          {/* Bed 3: Carbonaceous Slate Shale */}
          <rect x="-200" y="380" width="1600" height="32" fill="url(#strataShale)" stroke="#20231f" strokeWidth="1.5" />
          {/* Embedded Ammonite fossil spiral */}
          <g transform="translate(180, 396)" className={styles.fossilSymbol} stroke="#fbf8f1" strokeWidth="1.2" fill="none">
            <path d="M0,0 A5,5 0 0,1 7,2 A9,9 0 0,1 10,9 A13,13 0 0,1 3,17 A17,17 0 0,1 -10,13 A21,21 0 0,1 -16,-2 A25,25 0 0,1 -5,-18 A29,29 0 0,1 18,-18" />
          </g>
          <g transform="translate(680, 396)" className={styles.fossilSymbol} stroke="#fbf8f1" strokeWidth="1.2" fill="none">
            <path d="M0,0 A5,5 0 0,1 7,2 A9,9 0 0,1 10,9 A13,13 0 0,1 3,17 A17,17 0 0,1 -10,13 A21,21 0 0,1 -16,-2 A25,25 0 0,1 -5,-18 A29,29 0 0,1 18,-18" />
          </g>

          {/* Bed 4: Deep Basement Rock */}
          <rect x="-200" y="412" width="1600" height="30" fill="#20231f" />
        </g>

        {/* Stratigraphic Depth Ruler (Left overlay) */}
        <g className={styles.depthRuler}>
          <rect x="0" y="315" width="48" height="125" fill="#20231f" opacity="0.85" />
          <line x1="48" y1="315" x2="48" y2="440" stroke="#d8c6a3" strokeWidth="1.5" />
          <text x="6" y="328">0m</text>
          <line x1="40" y1="325" x2="48" y2="325" stroke="#d8c6a3" strokeWidth="1" />
          <text x="6" y="358">-30m</text>
          <line x1="36" y1="355" x2="48" y2="355" stroke="#d8c6a3" strokeWidth="1" />
          <text x="6" y="392">-75m</text>
          <line x1="36" y1="390" x2="48" y2="390" stroke="#d8c6a3" strokeWidth="1" />
          <text x="6" y="426">-140m</text>
          <line x1="36" y1="424" x2="48" y2="424" stroke="#d8c6a3" strokeWidth="1" />
        </g>

        {/* 7. Headlight Forward Illuminating Beam */}
        <polygon points="722,260 1000,220 1000,380 722,285" fill="url(#headlightBeam)" className={styles.lightBeam} />

        {/* 8. The Geological Survey Expedition Rover */}
        <g className={styles.roverBody}>
          {/* Rooftop Equipment: Core-Drill Mast & Seismic Radar */}
          <g transform="translate(480, 165)">
            {/* Mast frame */}
            <rect x="0" y="10" width="8" height="32" fill="#20231f" />
            <line x1="4" y1="0" x2="4" y2="10" stroke="#9e4d37" strokeWidth="2" />
            {/* Radar dish rotating */}
            <g className={styles.radarDish} transform="translate(4, 0)">
              <ellipse cx="0" cy="0" rx="14" ry="5" fill="#d8c6a3" stroke="#20231f" strokeWidth="2" />
              <line x1="0" y1="0" x2="0" y2="-8" stroke="#20231f" strokeWidth="1.5" />
              <circle cx="0" cy="-8" r="2.5" fill="#9e4d37" />
            </g>
          </g>

          {/* Roof Amber Hazard Beacon */}
          <g transform="translate(620, 192)">
            <rect x="0" y="4" width="14" height="6" fill="#20231f" rx="1" />
            <circle cx="7" cy="3" r="5" fill="#d8c6a3" stroke="#20231f" strokeWidth="1.5" className={styles.hazardLight} />
          </g>

          {/* Core Sample Storage Tubes (on rear flatbed) */}
          <g transform="translate(440, 202)">
            <rect x="0" y="0" width="38" height="28" fill="#405149" stroke="#20231f" strokeWidth="2" rx="3" />
            {/* 3 Core cylinders with colored strata rings */}
            <g transform="translate(6, 4)">
              <rect x="0" y="0" width="6" height="20" fill="#d8c6a3" stroke="#20231f" strokeWidth="1" />
              <line x1="0" y1="6" x2="6" y2="6" stroke="#9e4d37" strokeWidth="2" />
              <line x1="0" y1="12" x2="6" y2="12" stroke="#405149" strokeWidth="2" />
            </g>
            <g transform="translate(16, 4)">
              <rect x="0" y="0" width="6" height="20" fill="#ebe5da" stroke="#20231f" strokeWidth="1" />
              <line x1="0" y1="8" x2="6" y2="8" stroke="#9e4d37" strokeWidth="2" />
              <line x1="0" y1="14" x2="6" y2="14" stroke="#20231f" strokeWidth="2" />
            </g>
            <g transform="translate(26, 4)">
              <rect x="0" y="0" width="6" height="20" fill="#7f928b" stroke="#20231f" strokeWidth="1" />
              <line x1="0" y1="5" x2="6" y2="5" stroke="#d8c6a3" strokeWidth="2" />
              <line x1="0" y1="11" x2="6" y2="11" stroke="#9e4d37" strokeWidth="2" />
            </g>
          </g>

          {/* Main Rover Body Shell */}
          {/* Main cabin/chassis contour */}
          <path
            d="M430 230 L430 286 L445 286 L455 272 L505 272 L515 286 L535 286 L545 272 L585 272 L595 286 L635 286 L645 272 L685 272 L695 286 L726 286 L726 250 L675 202 L485 202 L430 230 Z"
            fill="#fbf8f1"
            stroke="#20231f"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Lower chassis plate */}
          <path d="M430 270 L726 270 L726 284 L430 284 Z" fill="#20231f" />

          {/* Front Cab Windshield (Tinted glass) */}
          <polygon
            points="618,208 668,208 710,248 618,248"
            fill="#7f928b"
            opacity="0.4"
            stroke="#20231f"
            strokeWidth="2"
          />
          {/* Windshield glare line */}
          <line x1="635" y1="212" x2="685" y2="244" stroke="#ffffff" strokeWidth="2" opacity="0.65" />

          {/* Door panel accent in Ochre (widened & centered so text never clips) */}
          <rect x="460" y="212" width="145" height="50" fill="#d8c6a3" stroke="#20231f" strokeWidth="2" rx="3" />
          {/* Decorative corner rivets */}
          <circle cx="466" cy="218" r="1.5" fill="#20231f" />
          <circle cx="599" cy="218" r="1.5" fill="#20231f" />
          <circle cx="466" cy="256" r="1.5" fill="#20231f" />
          <circle cx="599" cy="256" r="1.5" fill="#20231f" />

          {/* Stamped Typography on Door - Centered with textAnchor="middle" */}
          <text x="532.5" y="233" textAnchor="middle" className={styles.roverText}>GEO-SURVEY</text>
          <text x="532.5" y="250" textAnchor="middle" className={styles.roverSubtext}>UNIT // {code}</text>


          {/* Front Headlight Unit */}
          <rect x="718" y="252" width="10" height="18" fill="#d8c6a3" stroke="#20231f" strokeWidth="2" rx="2" />
          <ellipse cx="723" cy="261" rx="3" ry="6" fill="#fbf8f1" />

          {/* Heavy Front Bumper & Winch */}
          <rect x="724" y="272" width="14" height="12" fill="#9e4d37" stroke="#20231f" strokeWidth="2" rx="1" />
          <circle cx="731" cy="278" r="3" fill="#20231f" />
        </g>

        {/* 9. Heavy-Duty All-Terrain Wheels (6-wheel drive) */}
        {/* Wheel 1 (Rear) */}
        <g transform="translate(480, 286)">
          <g className={styles.wheel}>
            <circle cx="0" cy="0" r="24" fill="#20231f" stroke="#20231f" strokeWidth="2" />
            <circle cx="0" cy="0" r="16" fill="#d8c6a3" stroke="#20231f" strokeWidth="2" />
            <circle cx="0" cy="0" r="7" fill="#9e4d37" stroke="#20231f" strokeWidth="1.5" />
            {/* Wheel treads / spokes */}
            <line x1="-16" y1="0" x2="16" y2="0" stroke="#20231f" strokeWidth="2" />
            <line x1="0" y1="-16" x2="0" y2="16" stroke="#20231f" strokeWidth="2" />
            <line x1="-11" y1="-11" x2="11" y2="11" stroke="#20231f" strokeWidth="2" />
            <line x1="-11" y1="11" x2="11" y2="-11" stroke="#20231f" strokeWidth="2" />
          </g>
          {/* Axle hub cap */}
          <circle cx="0" cy="0" r="3" fill="#fbf8f1" />
        </g>

        {/* Wheel 2 (Middle) */}
        <g transform="translate(565, 286)">
          <g className={styles.wheel}>
            <circle cx="0" cy="0" r="24" fill="#20231f" stroke="#20231f" strokeWidth="2" />
            <circle cx="0" cy="0" r="16" fill="#d8c6a3" stroke="#20231f" strokeWidth="2" />
            <circle cx="0" cy="0" r="7" fill="#9e4d37" stroke="#20231f" strokeWidth="1.5" />
            <line x1="-16" y1="0" x2="16" y2="0" stroke="#20231f" strokeWidth="2" />
            <line x1="0" y1="-16" x2="0" y2="16" stroke="#20231f" strokeWidth="2" />
            <line x1="-11" y1="-11" x2="11" y2="11" stroke="#20231f" strokeWidth="2" />
            <line x1="-11" y1="11" x2="11" y2="-11" stroke="#20231f" strokeWidth="2" />
          </g>
          <circle cx="0" cy="0" r="3" fill="#fbf8f1" />
        </g>

        {/* Wheel 3 (Front) */}
        <g transform="translate(665, 286)">
          <g className={styles.wheel}>
            <circle cx="0" cy="0" r="24" fill="#20231f" stroke="#20231f" strokeWidth="2" />
            <circle cx="0" cy="0" r="16" fill="#d8c6a3" stroke="#20231f" strokeWidth="2" />
            <circle cx="0" cy="0" r="7" fill="#9e4d37" stroke="#20231f" strokeWidth="1.5" />
            <line x1="-16" y1="0" x2="16" y2="0" stroke="#20231f" strokeWidth="2" />
            <line x1="0" y1="-16" x2="0" y2="16" stroke="#20231f" strokeWidth="2" />
            <line x1="-11" y1="-11" x2="11" y2="11" stroke="#20231f" strokeWidth="2" />
            <line x1="-11" y1="11" x2="11" y2="-11" stroke="#20231f" strokeWidth="2" />
          </g>
          <circle cx="0" cy="0" r="3" fill="#fbf8f1" />
        </g>

        {/* 10. Frame Border */}
        <rect x="1" y="1" width="998" height="438" fill="none" stroke="#20231f" strokeWidth="2" />
      </svg>
    </div>
  );
}
