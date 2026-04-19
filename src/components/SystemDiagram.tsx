/**
 * SystemDiagram.tsx — engineering-style system diagram using React Flow.
 *
 * Shows the real power architecture:
 *   PV Array ──DC──▷ Inverter ──AC──▷ Facility Load
 *                       ↕ DC              ↕ AC
 *                    Battery            SEC Grid
 *                        ╲               ╱
 *                    ╔══════════════════════╗
 *                    ║  SolarBrain AI Brain ║
 *                    ╚══════════════════════╝
 *
 * The "Brain" node sits at the center-bottom, connected to every component
 * with dashed control/monitoring lines — making it visually clear that the
 * AI model orchestrates the entire energy system.
 */

import { useMemo } from 'react';
import ReactFlow, {
  Background, ConnectionLineType, Controls, Handle, Position,
  type Edge, type Node, type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  GeneratorSpec, GridScenario,
  RankedBattery, RankedInverter, RankedPanel,
} from '../types/api';

// ── Colour palette (matches brand) ─────────────────────────────────────────
const C = {
  gold:   '#BA7517',
  navy:   '#0A1520',
  oasis:  '#3D6B4E',
  purple: '#534AB7',
  blue:   '#185FA5',
  grey:   '#6B7280',
  dark:   '#111827',
  brain:  '#C8932E',
};

// ── Custom node types ──────────────────────────────────────────────────────

interface BoxData {
  title:    string;
  subtitle: string;
  color:    string;
  handles?: ('top' | 'bottom' | 'left' | 'right')[];
  icon?:    string;   // emoji or short symbol
}

function Box({ data }: NodeProps<BoxData>) {
  const handles = data.handles ?? ['left', 'right'];
  return (
    <div
      className="diagram-box"
      style={{ borderColor: data.color, boxShadow: `0 0 0 1px ${data.color}22 inset` }}
    >
      {handles.includes('left') && (
        <Handle type="target" id="left" position={Position.Left} style={{ background: data.color }} />
      )}
      {handles.includes('top') && (
        <Handle type="target" id="top" position={Position.Top} style={{ background: data.color }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {data.icon && <span style={{ fontSize: 16 }}>{data.icon}</span>}
        <div className="diagram-box__title" style={{ color: data.color }}>{data.title}</div>
      </div>
      <div className="diagram-box__sub">{data.subtitle}</div>
      {handles.includes('right') && (
        <Handle type="source" id="right" position={Position.Right} style={{ background: data.color }} />
      )}
      {handles.includes('bottom') && (
        <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: data.color }} />
      )}
    </div>
  );
}

/** Brain node — visually distinct, larger, glowing border */
function BrainBox({ data }: NodeProps<BoxData>) {
  return (
    <div className="diagram-brain">
      <Handle type="target" id="top" position={Position.Top} style={{ background: C.brain }} />
      <Handle type="target" id="left" position={Position.Left} style={{ background: C.brain }} />
      <Handle type="target" id="right" position={Position.Right} style={{ background: C.brain }} />
      <div className="diagram-brain__icon">🧠</div>
      <div className="diagram-brain__title">{data.title}</div>
      <div className="diagram-brain__sub">{data.subtitle}</div>
    </div>
  );
}

const nodeTypes = { box: Box, brain: BrainBox };

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  panel:        RankedPanel;
  inverter:     RankedInverter;
  battery:      RankedBattery;
  generator:    GeneratorSpec | null;
  gridScenario: GridScenario;
}

export function SystemDiagram({
  panel, inverter, battery, generator, gridScenario,
}: Props) {
  const { nodes, edges } = useMemo(
    () => buildGraph(panel, inverter, battery, generator, gridScenario),
    [panel, inverter, battery, generator, gridScenario],
  );

  return (
    <div className="diagram-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
      >
        <Background gap={14} size={1} color="#E5E7EB" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// ── Graph builder ──────────────────────────────────────────────────────────

function buildGraph(
  panel:        RankedPanel,
  inverter:     RankedInverter,
  battery:      RankedBattery,
  generator:    GeneratorSpec | null,
  gridScenario: GridScenario,
): { nodes: Node<BoxData>[]; edges: Edge[] } {
  const isOffGrid = gridScenario === 'off_grid';

  // ── Nodes ────────────────────────────────────────────────────────
  const nodes: Node<BoxData>[] = [
    {
      id: 'pv', type: 'box', position: { x: 0, y: 60 },
      data: {
        title: 'PV ARRAY',
        subtitle: `${panel.actualKwp} kWp · ${panel.unitsRequired}× ${panel.powerWp}Wp\n${panel.brand} ${panel.model}`,
        color: C.gold,
        icon: '☀️',
        handles: ['right', 'bottom'],
      },
    },
    {
      id: 'inv', type: 'box', position: { x: 280, y: 60 },
      data: {
        title: 'INVERTER · DC → AC',
        subtitle: `${inverter.actualKw} kW · ${inverter.unitsRequired}× ${inverter.capacityKw}kW\n${inverter.brand} ${inverter.model}`,
        color: C.dark,
        icon: '⚡',
        handles: ['left', 'right', 'bottom'],
      },
    },
    {
      id: 'load', type: 'box', position: { x: 560, y: 60 },
      data: {
        title: 'FACILITY LOAD',
        subtitle: 'AC demand side',
        color: C.dark,
        icon: '🏭',
        handles: ['left', 'bottom'],
      },
    },
    {
      id: 'batt', type: 'box', position: { x: 80, y: 240 },
      data: {
        title: 'BATTERY BANK',
        subtitle: `${battery.actualKwh} kWh · ${battery.unitsRequired}× ${battery.capacityKwh}kWh\n${battery.brand} · ${battery.chemistry}`,
        color: C.purple,
        icon: '🔋',
        handles: ['top', 'bottom'],
      },
    },
  ];

  // Grid or Generator
  if (!isOffGrid) {
    nodes.push({
      id: 'grid', type: 'box', position: { x: 470, y: 240 },
      data: {
        title: 'SEC GRID',
        subtitle: 'Bidirectional · net metering',
        color: C.blue,
        icon: '🔌',
        handles: ['top', 'bottom'],
      },
    });
  } else if (generator) {
    nodes.push({
      id: 'gen', type: 'box', position: { x: 470, y: 240 },
      data: {
        title: 'DIESEL GENERATOR',
        subtitle: `${generator.kva} kVA · ${generator.fuelConsumptionLph} L/h`,
        color: C.grey,
        icon: '⛽',
        handles: ['top', 'bottom'],
      },
    });
  }

  // Brain — the AI controller at center bottom
  const brainX = !isOffGrid || generator ? 280 : 200;
  nodes.push({
    id: 'brain', type: 'brain', position: { x: brainX, y: 400 },
    data: {
      title: 'SolarBrain AI',
      subtitle: '7-mode energy controller\nMonitors · Predicts · Optimizes',
      color: C.brain,
    },
  });

  // ── Edges — power flow (solid) ────────────────────────────────────
  const pw = 2.4;  // power line width
  const edges: Edge[] = [
    // PV → Inverter (DC)
    {
      id: 'e-pv-inv', source: 'pv', target: 'inv',
      sourceHandle: 'right', targetHandle: 'left',
      type: 'smoothstep', label: 'DC',
      labelStyle: { fontSize: 10, fontWeight: 700, fill: C.gold },
      style: { stroke: C.gold, strokeWidth: pw },
    },
    // Inverter → Load (AC)
    {
      id: 'e-inv-load', source: 'inv', target: 'load',
      sourceHandle: 'right', targetHandle: 'left',
      type: 'smoothstep', label: 'AC',
      labelStyle: { fontSize: 10, fontWeight: 700, fill: C.dark },
      style: { stroke: C.dark, strokeWidth: pw },
    },
    // Inverter ↔ Battery (DC, bidirectional)
    {
      id: 'e-inv-batt', source: 'inv', target: 'batt',
      sourceHandle: 'bottom', targetHandle: 'top',
      type: 'smoothstep', label: 'DC ↕',
      labelStyle: { fontSize: 10, fontWeight: 700, fill: C.purple },
      style: { stroke: C.purple, strokeWidth: pw },
    },
  ];

  // Grid or Generator connection
  if (!isOffGrid) {
    edges.push({
      id: 'e-inv-grid', source: 'inv', target: 'grid',
      sourceHandle: 'bottom', targetHandle: 'top',
      type: 'smoothstep', label: 'AC ↕',
      labelStyle: { fontSize: 10, fontWeight: 700, fill: C.blue },
      style: { stroke: C.blue, strokeWidth: pw, strokeDasharray: '6 3' },
    });
  } else if (generator) {
    edges.push({
      id: 'e-gen-inv', source: 'gen', target: 'inv',
      sourceHandle: 'top', targetHandle: 'bottom',
      type: 'smoothstep', label: 'AC',
      labelStyle: { fontSize: 10, fontWeight: 700, fill: C.grey },
      style: { stroke: C.grey, strokeWidth: pw, strokeDasharray: '6 3' },
    });
  }

  // ── Edges — brain control/monitoring lines (dashed green) ─────────
  const cw = 1.4;  // control line width
  const cStyle = { stroke: C.oasis, strokeWidth: cw, strokeDasharray: '3 3' };

  // Brain connects to PV, Inverter, Battery
  edges.push(
    { id: 'e-brain-pv',   source: 'brain', target: 'pv',   sourceHandle: 'left',  targetHandle: 'bottom', type: 'smoothstep', style: cStyle, animated: true },
    { id: 'e-brain-batt', source: 'brain', target: 'batt', sourceHandle: 'left',  targetHandle: 'bottom', type: 'smoothstep', style: cStyle, animated: true },
    { id: 'e-brain-load', source: 'brain', target: 'load', sourceHandle: 'right', targetHandle: 'bottom', type: 'smoothstep', style: cStyle, animated: true },
  );

  // Grid or generator control
  if (!isOffGrid) {
    edges.push({
      id: 'e-brain-grid', source: 'brain', target: 'grid',
      sourceHandle: 'right', targetHandle: 'bottom',
      type: 'smoothstep', style: cStyle, animated: true,
    });
  } else if (generator) {
    edges.push({
      id: 'e-brain-gen', source: 'brain', target: 'gen',
      sourceHandle: 'right', targetHandle: 'bottom',
      type: 'smoothstep', style: cStyle, animated: true,
    });
  }

  return { nodes, edges };
}
