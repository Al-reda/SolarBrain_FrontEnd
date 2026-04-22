import { useMemo } from 'react';
import ReactFlow, { Background, ConnectionLineType, Controls, Handle, Position, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import type { GeneratorSpec, GridScenario, RankedBattery, RankedInverter, RankedPanel } from '../types/api';

interface BoxData { title: string; sub1: string; sub2?: string; bg: string; border: string; tc: string; handles?: ('top'|'bottom'|'left'|'right')[]; }

function Box({ data }: NodeProps<BoxData>) {
  const h = data.handles ?? ['left','right'];
  return (
    <div style={{ background: data.bg, border: `2px solid ${data.border}`, borderRadius: 12, padding: '14px 18px', minWidth: 180, textAlign: 'center', fontFamily: 'inherit' }}>
      {h.includes('left') && <Handle type="target" id="left" position={Position.Left} style={{ background: data.border }} />}
      {h.includes('top') && <Handle type="target" id="top" position={Position.Top} style={{ background: data.border }} />}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: data.tc, marginBottom: 3 }}>{data.title}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{data.sub1}</div>
      {data.sub2 && <div style={{ fontSize: 11, color: '#666', marginTop: 2, whiteSpace: 'pre-line' as const }}>{data.sub2}</div>}
      {h.includes('right') && <Handle type="source" id="right" position={Position.Right} style={{ background: data.border }} />}
      {h.includes('bottom') && <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: data.border }} />}
    </div>
  );
}

function BrainNode({ data }: NodeProps<BoxData>) {
  return (
    <div style={{ background: '#0D1B2A', border: '2px solid #C8932E', borderRadius: 14, padding: '16px 24px', minWidth: 220, textAlign: 'center', boxShadow: '0 0 16px rgba(200,147,46,0.25)' }}>
      <Handle type="target" id="top" position={Position.Top} style={{ background: '#2E8B57' }} />
      <Handle type="target" id="left" position={Position.Left} style={{ background: '#2E8B57' }} />
      <Handle type="source" id="right" position={Position.Right} style={{ background: '#2E8B57' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: '#2E8B57' }} />
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#C8932E' }}>SMART CONTROLLER</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '4px 0' }}>{data.sub1}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{data.sub2}</div>
    </div>
  );
}

const nodeTypes = { box: Box, brain: BrainNode };

interface Props { panel: RankedPanel; inverter: RankedInverter; battery: RankedBattery; generator: GeneratorSpec | null; gridScenario: GridScenario; criticalLoadPct?: number; }

export function SystemDiagram({ panel, inverter, battery, generator, gridScenario, criticalLoadPct = 20 }: Props) {
  const { nodes, edges } = useMemo(
    () => buildGraph(panel, inverter, battery, generator, gridScenario, criticalLoadPct),
    [panel, inverter, battery, generator, gridScenario, criticalLoadPct],
  );
  return (
    <div className="diagram-wrap">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} connectionLineType={ConnectionLineType.SmoothStep}
        fitView fitViewOptions={{ padding: 0.12 }} proOptions={{ hideAttribution: true }}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag zoomOnScroll={false}>
        <Background gap={14} size={1} color="#E5E7EB" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function buildGraph(p: RankedPanel, inv: RankedInverter, bat: RankedBattery, gen: GeneratorSpec | null, gs: GridScenario, critPct: number) {
  const isOff = gs === 'off_grid';
  const shiftPct = Math.max(0, 100 - critPct);
  const nodes: Node<BoxData>[] = [
    { id: 'pv', type: 'box', position: { x: 0, y: 0 }, data: { title: 'PV ARRAY', sub1: `${p.actualKwp} kWp · ${p.unitsRequired}× ${p.powerWp}W`, sub2: `${p.brand} ${p.model}`, bg: '#FFF8E7', border: '#D4A42B', tc: '#B8860B', handles: ['right', 'bottom'] } },
    { id: 'inv', type: 'box', position: { x: 320, y: 0 }, data: { title: 'INVERTER', sub1: `${inv.brand}`, sub2: `${inv.model}\n${inv.actualKw} kW · ${inv.unitsRequired}× ${inv.capacityKw}kW`, bg: '#E8F5EC', border: '#2E8B57', tc: '#2E8B57', handles: ['left', 'right', 'bottom'] } },
    { id: 'crit', type: 'box', position: { x: 650, y: 0 }, data: { title: 'CRITICAL LOADS', sub1: `${critPct}% of load`, sub2: 'Servers, safety systems,\ncore production', bg: '#F0ECFA', border: '#6C5CE7', tc: '#6C5CE7', handles: ['left', 'bottom'] } },
    { id: 'batt', type: 'box', position: { x: 0, y: 230 }, data: { title: 'BATTERY', sub1: `${bat.brand}`, sub2: `${bat.model}\n${bat.actualKwh} kWh`, bg: '#E8F4FD', border: '#3498DB', tc: '#3498DB', handles: ['right', 'bottom'] } },
    { id: 'brain', type: 'brain', position: { x: 300, y: 220 }, data: { title: 'SMART CONTROLLER', sub1: 'Switching brain', sub2: '7-mode rule engine', bg: '#0D1B2A', border: '#C8932E', tc: '#C8932E' } },
    { id: 'shift', type: 'box', position: { x: 630, y: 230 }, data: { title: 'SHIFTABLE LOADS', sub1: `~${shiftPct}% of load`, sub2: 'HVAC, compressors,\nnon-critical lines', bg: '#F0ECFA', border: '#6C5CE7', tc: '#6C5CE7', handles: ['left', 'bottom'] } },
  ];
  if (!isOff) {
    nodes.push({ id: 'grid', type: 'box', position: { x: 300, y: 440 }, data: { title: 'UTILITY GRID', sub1: 'SEC grid', sub2: 'Backup + net metering', bg: '#F0F0F0', border: '#95A5A6', tc: '#7F8C8D', handles: ['top'] } });
  } else if (gen) {
    nodes.push({ id: 'gen', type: 'box', position: { x: 300, y: 440 }, data: { title: 'DIESEL GENERATOR', sub1: `${gen.kva} kVA`, sub2: `${gen.fuelConsumptionLph} L/h`, bg: '#FFF3E0', border: '#E67E22', tc: '#D35400', handles: ['top'] } });
  }
  const pw = 2.2;
  const edges: Edge[] = [
    { id: 'e1', source: 'pv', target: 'inv', sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', label: 'DC power', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#D4A42B' }, style: { stroke: '#D4A42B', strokeWidth: pw } },
    { id: 'e2', source: 'inv', target: 'crit', sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', label: 'Always on', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#6C5CE7' }, style: { stroke: '#374151', strokeWidth: pw } },
    { id: 'e3', source: 'inv', target: 'brain', sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep', label: 'AC bus', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#2E8B57' }, style: { stroke: '#2E8B57', strokeWidth: pw } },
    { id: 'e4', source: 'batt', target: 'brain', sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', label: 'Charge / Discharge', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#3498DB' }, style: { stroke: '#3498DB', strokeWidth: pw } },
    { id: 'e5', source: 'brain', target: 'shift', sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', label: 'Dispatch', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#6C5CE7' }, style: { stroke: '#6C5CE7', strokeWidth: pw, strokeDasharray: '6 3' } },
  ];
  if (!isOff) {
    edges.push({ id: 'e6', source: 'brain', target: 'grid', sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep', label: 'Net metering', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#95A5A6' }, style: { stroke: '#95A5A6', strokeWidth: pw, strokeDasharray: '6 3' } });
  } else if (gen) {
    edges.push({ id: 'e6', source: 'brain', target: 'gen', sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep', label: 'Backup power', labelStyle: { fontSize: 10, fontWeight: 600, fill: '#E67E22' }, style: { stroke: '#E67E22', strokeWidth: pw, strokeDasharray: '6 3' } });
  }
  return { nodes, edges };
}
