import React, { useState, useRef, useLayoutEffect } from "react";
import PlanAvecZoneImpression from "~/epure/PlanAvecZoneImpression";
const cmToPx = (cm) => cm * 37.7952755906;

export function Epure() {
  const [radiusCm, setRadiusCm] = useState(7.5); // en cm
  const [angle, setAngle] = useState(135);

  const [diametreTubeCm, setdiametreTubeCm] = useState(3.4); // en cm
  const radius = cmToPx(radiusCm);
  const rayonTubeCm = diametreTubeCm / 2
  const parallelDistance = cmToPx(rayonTubeCm); // conversion pour le SVG

  const [size, setSize] = useState({width: 0, height: 0});


  const cx = size.width / 2;
  const cy = size.height / 2;

  // angle en radians
  const thetaRad = (angle * Math.PI) / 180;
  const d = radius / Math.sin(thetaRad / 2);
  const px = cx;
  const py = cy - d;


  // calcul des tangentes
  const alpha = Math.acos(radius / d);
  const beta = Math.atan2(py - cy, px - cx);

  const t1x = cx + radius * Math.cos(beta + alpha);
  const t1y = cy + radius * Math.sin(beta + alpha);

  const t2x = cx + radius * Math.cos(beta - alpha);
  const t2y = cy + radius * Math.sin(beta - alpha);

  const factor = 1000;
  const l1x = px + (t1x - px) * factor;
  const l1y = py + (t1y - py) * factor;

  const l2x = px + (t2x - px) * factor;
  const l2y = py + (t2y - py) * factor;

  const red1x = t1x + (t1x - px) * factor;
  const red1y = t1y + (t1y - py) * factor;

  const red2x = t2x + (t2x - px) * factor;
  const red2y = t2y + (t2y - py) * factor;

  // === DROITES VERTES PROLONGÉES ===

  // vecteurs directeurs des tangentes rouges
  const dir1x = red1x - t1x;
  const dir1y = red1y - t1y;
  const dir2x = red2x - t2x;
  const dir2y = red2y - t2y;

  // longueurs pour normaliser
  const len1 = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
  const len2 = Math.sqrt(dir2x * dir2x + dir2y * dir2y);

  // vecteurs unitaires perpendiculaires (pour le décalage parallèle)
  const ux1 = -dir1y / len1;
  const uy1 = dir1x / len1;
  const ux2 = -dir2y / len2;
  const uy2 = dir2x / len2;

  const extend = 2000; // longueur de prolongement

  function makeParallelLine(tx, ty, dirx, diry, ux, uy, len, offset) {
    const baseX = tx + ux * offset;
    const baseY = ty + uy * offset;
    return {
      x1: baseX - (dirx / len) * extend,
      y1: baseY - (diry / len) * extend,
      x2: baseX + (dirx / len) * extend,
      y2: baseY + (diry / len) * extend,
    };
  }

  const lineA = makeParallelLine(
      t1x,
      t1y,
      dir1x,
      dir1y,
      ux1,
      uy1,
      len1,
      -parallelDistance
  );
  const lineB = makeParallelLine(
      t2x,
      t2y,
      dir2x,
      dir2y,
      ux2,
      uy2,
      len2,
      +parallelDistance
  );
  const lineC = makeParallelLine(t1x, t1y, dir1x, dir1y, ux1, uy1, len1, +parallelDistance)
  const lineD = makeParallelLine(t2x, t2y, dir2x, dir2y, ux2, uy2, len2, -parallelDistance)
  const greenLines = [lineA, lineB, lineC, lineD];

  // === Intersection des droites vertes ===
  function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-6) return null; // droites parallèles
    const px =
        ((x1 * y2 - y1 * x2) * (x3 - x4) -
            (x1 - x2) * (x3 * y4 - y3 * x4)) /
        denom;
    const py =
        ((x1 * y2 - y1 * x2) * (y3 - y4) -
            (y1 - y2) * (x3 * y4 - y3 * x4)) /
        denom;
    return {x: px, y: py};
  }

  const intersection = lineIntersection(
      lineA.x1,
      lineA.y1,
      lineA.x2,
      lineA.y2,
      lineB.x1,
      lineB.y1,
      lineB.x2,
      lineB.y2
  );

  // === Calcul du cercle violet ===
  let distanceToCenter = 0;
  if (intersection) {
    const dx = intersection.x - cx;
    const dy = intersection.y - cy;
    distanceToCenter = Math.sqrt(dx * dx + dy * dy);
  }

  const circleAuto1 = {
    cx,
    cy: cy + ((radius * distanceToCenter) / (radius + parallelDistance)) - distanceToCenter,
    r: radius,
  };

  const circleAuto2 = {
    cx,
    cy: cy - ((radius * distanceToCenter) / (radius + parallelDistance)) + distanceToCenter,
    r: radius,
  };

  // === Fonction pour trouver le point de tangence entre une droite et un cercle ===
  function tangentPoints(line, circle) {
    const {x1, y1, x2, y2} = line;
    const {cx, cy, r} = circle;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
    const c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - r * r;

    let delta = b * b - 4 * a * c;
    const epsilon = 5;
    if (delta < -epsilon) return null;
    if (delta < 0) delta = 0; // on corrige les petits négatifs dus à la précision

    const sqrtDelta = Math.sqrt(delta);
    const t1 = (-b + sqrtDelta) / (2 * a);
    const t2 = (-b - sqrtDelta) / (2 * a);

    const points = [
      {x: x1 + t1 * dx, y: y1 + t1 * dy},
      {x: x1 + t2 * dx, y: y1 + t2 * dy},
    ];

    // on choisit celui le plus proche du cercle
    return points.sort(
        (p1, p2) =>
            Math.abs(Math.hypot(p1.x - cx, p1.y - cy) - r) -
            Math.abs(Math.hypot(p2.x - cx, p2.y - cy) - r)
    )[0];
  }

  const tanA = tangentPoints(lineA, circleAuto1);
  const tanB = tangentPoints(lineB, circleAuto1);
  // === Points de tangence pour le cercle jaune ===
  const tanC = tangentPoints(lineC, circleAuto2);
  const tanD = tangentPoints(lineD, circleAuto2);


  // === Construire l'arc SVG correct (petit arc, sens conforme) ===
  function buildArcPath(p1, p2, circle) {
    if (!p1 || !p2 || !circle) return null;
    const {cx: ccx, cy: ccy, r: rr} = circle;
    const a1 = Math.atan2(p1.y - ccy, p1.x - ccx);
    const a2 = Math.atan2(p2.y - ccy, p2.x - ccx);

    // différence d'angle normalisée dans [-PI, PI]
    let delta = a2 - a1;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    while (delta > Math.PI) delta -= 2 * Math.PI;

    const largeArcFlag = Math.abs(delta) > Math.PI ? 1 : 0;
    // sweepFlag = 1 quand delta positif (sens "croissant" des angles),
    // = 0 quand delta négatif. Cette logique gère correctement l'orientation SVG (y vers le bas).
    const sweepFlag = delta >= 0 ? 1 : 0;

    return `M ${p1.x} ${p1.y} A ${rr} ${rr} 0 ${largeArcFlag} ${sweepFlag} ${p2.x} ${p2.y}`;
  }

  const greenArcPath = buildArcPath(tanA, tanB, circleAuto1);


  // === Arc vert sur le cercle jaune ===
  const greenArcPath2 = buildArcPath(tanC, tanD, circleAuto2);
  let truncatedLineA = null;
  let truncatedLineB = null;
  let truncatedLineC = null;
  let truncatedLineD = null;

  if (tanA) {
    const dirX = lineA.x2 - lineA.x1;
    const dirY = lineA.y2 - lineA.y1;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);

    truncatedLineA = {
      x1: tanA.x,
      y1: tanA.y,
      x2: tanA.x + (dirX / len) * extend, // même direction qu'avant
      y2: tanA.y + (dirY / len) * extend,
    };
  }
  if (tanB) {
    const dirX = lineB.x2 - lineB.x1;
    const dirY = lineB.y2 - lineB.y1;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);

    truncatedLineB = {
      x1: tanB.x,
      y1: tanB.y,
      x2: tanB.x + (dirX / len) * extend,
      y2: tanB.y + (dirY / len) * extend,
    };
  }

  if (tanC) {
    const dirX = lineC.x2 - lineC.x1;
    const dirY = lineC.y2 - lineC.y1;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);

    truncatedLineC = {
      x1: tanC.x,
      y1: tanC.y,
      x2: tanC.x + (dirX / len) * extend, // même direction qu'avant
      y2: tanC.y + (dirY / len) * extend,
    };
  }

  if (tanD) {
    const dirX = lineD.x2 - lineD.x1;
    const dirY = lineD.y2 - lineD.y1;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);

    truncatedLineD = {
      x1: tanD.x,
      y1: tanD.y,
      x2: tanD.x + (dirX / len) * extend,
      y2: tanD.y + (dirY / len) * extend,
    };
  }
  const yCandidates = [cy - radius, cy + radius];
  const pointSurArcRouge = {
    x: cx, y: yCandidates.reduce((prev, curr) => {
      // on prend le y qui est le plus proche de l'intervalle [min(t1y,t2y), max(t1y,t2y)]
      const minY = Math.min(t1y, t2y);
      const maxY = Math.max(t1y, t2y);
      if (curr >= minY && curr <= maxY) return curr;
      // sinon on garde celui le plus proche
      const prevDist = Math.min(Math.abs(prev - minY), Math.abs(prev - maxY));
      const currDist = Math.min(Math.abs(curr - minY), Math.abs(curr - maxY));
      return currDist < prevDist ? curr : prev;
    })
  };

  function lineCircleIntersection(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
    const c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - r ** 2;
    let delta = b * b - 4 * a * c;
    if (delta < 0) delta = 0; // corrige petites erreurs de précision
    const sqrtDelta = Math.sqrt(delta);
    const t1 = (-b + sqrtDelta) / (2 * a);
    const t2 = (-b - sqrtDelta) / (2 * a);
    return [
      {x: x1 + t1 * dx, y: y1 + t1 * dy},
      {x: x1 + t2 * dx, y: y1 + t2 * dy}
    ];
  }
  const candidatesLeft = lineCircleIntersection(px, py, l2x, l2y, cx, cy, radius);
  const pointIntersectionGauche = candidatesLeft.find(p =>
      p.x >= Math.min(t1x, t2x) && p.x <= Math.max(t1x, t2x) &&
      p.y >= Math.min(t1y, t2y) && p.y <= Math.max(t1y, t2y)
  ) || candidatesLeft[0];

  function arcLength(p1, p2, circle) {
    const {cx, cy, r} = circle;
    const a1 = Math.atan2(p1.y - cy, p1.x - cx);
    const a2 = Math.atan2(p2.y - cy, p2.x - cx);

    // angle absolu entre les deux points, dans [0, 2*PI]
    let delta = a2 - a1;
    if (delta < 0) delta += 2 * Math.PI;

    return r * delta;
  }
  let longueurArc = 0;
  if (pointIntersectionGauche && pointSurArcRouge) {
    longueurArc = arcLength(pointIntersectionGauche, pointSurArcRouge, {cx, cy, r: radius});
  }
  const dirX = l1x - px;
  const dirY = l1y - py;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const ux = dirX / len;       // X reste le même
  const uy = -dirY / len;      // inverser Y pour SVG
  let jauneX2 = 0
  let jauneY2 = 0
  if (pointIntersectionGauche) {
    jauneX2 = pointIntersectionGauche.x + ux * longueurArc;
    jauneY2 = pointIntersectionGauche.y + uy * longueurArc;
  }
  const svgWidth = 2000;
  const svgHeight = 1500;

  const svgPlan = (
      <>
        {/* Cercle bleu */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="blue" strokeWidth={2}/>

        {/* Tangentes bleues */}
        <line x1={px} y1={py} x2={l1x} y2={l1y} stroke="blue" strokeWidth={2}/>
        <line x1={px} y1={py} x2={l2x} y2={l2y} stroke="blue" strokeWidth={2}/>

        {/* Arc rouge intérieur */}
        <path d={`M ${t1x} ${t1y} A ${radius} ${radius} 0 0 0 ${t2x} ${t2y}`} fill="none" stroke="red"
              strokeWidth={2}/>

        {/* Tangentes rouges */}
        <line x1={t1x} y1={t1y} x2={red1x} y2={red1y} stroke="red" strokeWidth={2}/>
        <line x1={t2x} y1={t2y} x2={red2x} y2={red2y} stroke="red" strokeWidth={2}/>

        {/* Droites vertes prolongées */}
        {/*{greenLines.map((l, i) => (*/}
        {/*    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="green" strokeWidth={2} />*/}
        {/*))}*/}

        {/* Cercle violet */}
        {/*<circle cx={circleAuto1.cx} cy={circleAuto1.cy} r={circleAuto1.r} fill="none" stroke="purple" strokeWidth={2} />*/}
        {/*<circle cx={circleAuto2.cx} cy={circleAuto2.cy} r={circleAuto2.r} fill="none" stroke="yellow" strokeWidth={2} />*/}

        {/* Arc vert (petit arc du cercle violet) — construit avec flags corrects */}
        {greenArcPath && (
            <path
                d={greenArcPath}
                fill="none"
                stroke="green"
                strokeWidth={2}
            />
        )}

        {/* Point d’origine */}
        <circle cx={px} cy={py} r={3} fill="black"/>
        {/* Arc vert du cercle jaune */}
        {greenArcPath2 && (
            <path
                d={greenArcPath2}
                fill="none"
                stroke="green"
                strokeWidth={2}
            />
        )}
        {truncatedLineA && (
            <line
                x1={truncatedLineA.x1}
                y1={truncatedLineA.y1}
                x2={truncatedLineA.x2}
                y2={truncatedLineA.y2}
                stroke="green"
                strokeWidth={2}
            />
        )}
        {truncatedLineB && (
            <line
                x1={truncatedLineB.x1}
                y1={truncatedLineB.y1}
                x2={truncatedLineB.x2}
                y2={truncatedLineB.y2}
                stroke="green"
                strokeWidth={2}
            />
        )}
        {truncatedLineC && (
            <line
                x1={truncatedLineC.x1}
                y1={truncatedLineC.y1}
                x2={truncatedLineC.x2}
                y2={truncatedLineC.y2}
                stroke="green"
                strokeWidth={2}
            />
        )}
        {truncatedLineD && (
            <line
                x1={truncatedLineD.x1}
                y1={truncatedLineD.y1}
                x2={truncatedLineD.x2}
                y2={truncatedLineD.y2}
                stroke="green"
                strokeWidth={2}
            />
        )}
        {pointSurArcRouge && (
            <circle cx={pointSurArcRouge.x} cy={pointSurArcRouge.y} r={4} fill="orange"/>
        )}
        {pointIntersectionGauche && (
            <circle cx={pointIntersectionGauche.x} cy={pointIntersectionGauche.y} r={4} fill="orange"/>
        )}
        {pointIntersectionGauche && (
            <line
                x1={pointIntersectionGauche.x}
                y1={pointIntersectionGauche.y}
                x2={jauneX2}
                y2={jauneY2}
                stroke="yellow"
                strokeWidth={2}
            />
        )
        }
        {pointIntersectionGauche && (
            <circle
                cx={jauneX2}
                cy={jauneY2}
                r={4}           // taille du point
                fill="yellow"
            />
        )
        }
      </>
  );


  // const svgPlan = (
  //     <>
  //       <rect width="100%" height="100%" fill="#f8f8f8" />
  //       <circle cx="400" cy="400" r="120" fill="none" stroke="blue" strokeWidth="2" />
  //       <text x="350" y="410" fontSize="30" fill="#333">
  //         Plan d’essai
  //       </text>
  //     </>
  // );
  return (
      <div style={{display: "flex", height: "100vh"}}>
        {/* Paramètres */}
        <div
            style={{
              width: 250,
              padding: 20,
              borderRight: "1px solid #ccc",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
        >
          <h2>Paramètres</h2>
          <div>
            <label>Rayon de cintrage : {radiusCm.toFixed(1)} cm</label>
            <input
                type="number"
                min="0.5"
                max="10"
                step="0.1"
                value={radiusCm}
                onChange={(e) => setRadiusCm(Number(e.target.value))}
                style={{width: "100%"}}
            />
          </div>

          <div>
            <label>Diametre du tube: {diametreTubeCm.toFixed(1)} cm</label>
            <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={diametreTubeCm}
                onChange={(e) =>
                    setdiametreTubeCm(Number(e.target.value))
                }
                style={{width: "100%"}}
            />
          </div>

          <div>
            <label>Angle souhaité : {angle}°</label>
            <input
                type="number"
                min="10"
                max="179"
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                style={{width: "100%"}}
            />
          </div>
        </div>
        <div style={{flex: 1, position: "relative"}}>
          <PlanAvecZoneImpression svgWidth={svgWidth} svgHeight={svgHeight} svgPlan={svgPlan}/>
        </div>
      </div>
  );
}
