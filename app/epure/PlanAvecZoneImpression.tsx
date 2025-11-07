import React, { useState, useRef, useEffect } from "react";
import { Canvg } from "canvg";

const CM_TO_PX = 37.7952755906;
const A4_WIDTH = 21 * CM_TO_PX;
const A4_HEIGHT = 29.686 * CM_TO_PX;

export default function PlanAvecZoneImpression({ svgWidth, svgHeight, svgPlan }) {
    const [pos, setPos] = useState({ x: 50, y: 50 });
    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);
    const [rotation, setRotation] = useState(0);

    const rectTransform = `
  rotate(${rotation} ${pos.x + A4_WIDTH/2} ${pos.y + A4_HEIGHT/2})
`;
    const handleMouseDown = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();

        // positions relatives au SVG
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setOffset({ x: mouseX - pos.x, y: mouseY - pos.y });
        setDragging(true);

        e.preventDefault(); // empêche la sélection de texte
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let newX = mouseX - offset.x;
        let newY = mouseY - offset.y;

        // limitation adaptée au viewBox centré
        const minX = -svgWidth;
        const maxX = svgWidth - A4_WIDTH;
        const minY = -svgHeight;
        const maxY = svgHeight - A4_HEIGHT;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => setDragging(false);

    // ✅ Attache les écouteurs globaux quand on drag
    useEffect(() => {
        if (dragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        } else {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragging]);

    const handlePrint = async () => {
        const svg = svgRef.current;
        const serializer = new XMLSerializer();
        if(!svg){
            return
        }
        // Crée un SVG temporaire qui ne contient que la zone sélectionnée
        // on prend uniquement les enfants sauf le rectangle bleu
        const svgChildren = Array.from(svgRef.current.children)
            .filter(el => el.tagName.toLowerCase() !== "rect")
            .map(el => el.outerHTML)
            .join("");


        const rectWidth = A4_WIDTH ;
        const rectHeight =  A4_HEIGHT ;
        const centerX = pos.x + A4_WIDTH / 2;
        const centerY = pos.y + A4_HEIGHT / 2;

        const tempSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${rectWidth}" height="${rectHeight}">
  <g transform="
      translate(${rectWidth / 2}, ${rectHeight / 2})
      rotate(${-rotation})
      translate(${-centerX}, ${-centerY})
  ">
    ${svgChildren}
  </g>
</svg>
`;

        const canvas = document.createElement("canvas");
        canvas.width = A4_WIDTH;
        canvas.height = A4_HEIGHT;
        const ctx = canvas.getContext("2d");

        const v = await Canvg.fromString(ctx, tempSvg);
        await v.render();

        const dataUrl = canvas.toDataURL("image/png");

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
    <html>
      <head><title>Zone à imprimer</title></head>
      <body style="margin:0">
        <img src="${dataUrl}" style="width:100%;height:auto"/>
        <script>window.onload = () => window.print()</script>
      </body>
    </html>
  `);
        printWindow.document.close();
    };

    return (
        <div style={{width: "100%", height: "100%", position: "relative"}}>
            <div style={{position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: 10}}>
                <button onClick={handlePrint}>🖨️ Imprimer la zone</button>
                <button onClick={() => setRotation(prev => (prev === 0 ? 90 : 0))}>🔄 Tourner rectangle</button>
            </div>

            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`${-svgWidth / 2} ${-svgHeight / 2} ${svgWidth} ${svgHeight}`}  // très important
                style={{border: "1px solid #ccc", cursor: dragging ? "grabbing" : "grab"}}
            >
                {svgPlan}
                <rect
                    x={pos.x}
                    y={pos.y}
                    width={A4_WIDTH}
                    height={A4_HEIGHT}
                    fill="rgba(0,120,255,0.2)"
                    stroke="#0078ff"
                    strokeWidth={2}
                    onMouseDown={handleMouseDown}
                    transform={rectTransform}
                />

            </svg>
        </div>
    );
}
