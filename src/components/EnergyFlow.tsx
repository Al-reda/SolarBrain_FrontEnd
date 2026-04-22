/**
 * EnergyFlow.tsx — live energy-flow diagram matching the SystemDiagram layout.
 * Shows live kW values and animated edges during simulation.
 * Layout: PV → Inverter → Critical Loads, Battery ↔ Controller → Shiftable Loads, Grid
 */

import { useMemo } from 'react';
import ReactFlow, { Background, ConnectionLineType, Handle, Position, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import type { SimulationState, SystemDesign } from '../types/api';

interface BoxData { title: string; value: string; bg: string; border: string; tc: string; active: boolean; handles?: ('top'|'bottom'|'left'|'right')[]; }

function FlowBox({ data }: NodeProps<BoxData>) {
  const h = data.handles ?? ['left', 'right'];
  const opacity = data.active ? 1 : 0.5;
  return (
    <div style={{ background: data.bg, border: `2px solid ${data.border}`, borderRadius: 12, padding: '12px 16px', minWidth: 160, textAlign: 'center', fontFamily: 'inherit', opacity }}>
      {h.includes('left') && <Handle type="target" id="left" position={Position.Left} style={{ background: data.border }} />}
      {h.includes('top') && <Handle type="target" id="top" position={Position.Top} style={{ background: data.border }} />}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: data.tc, marginBottom: 2 }}>{data.title}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{data.value}</div>
      {h.includes('right') && <Handle type="source" id="right" position={Position.Right} style={{ background: data.border }} />}
      {h.includes('bottom') && <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: data.border }} />}
    </div>
  );
}

function BrainFlow({ data }: NodeProps<BoxData>) {
  return (
    <div style={{ background: '#0D1B2A', border: '2px solid #C8932E', borderRadius: 14, padding: '14px 20px', minWidth: 200, textAlign: 'center', boxShadow: '0 0 12px rgba(200,147,46,0.2)' }}>
      <Handle type="target" id="top" position={Position.Top} style={{ background: '#2E8B57' }} />
      <Handle type="target" id="left" position={Position.Left} style={{ background: '#2E8B57' }} />
      <Handle type="source" id="right" position={Position.Right} style={{ background: '#2E8B57' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: '#2E8B57' }} />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#C8932E' }}>SMART CONTROLLER</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '3px 0' }}>{data.value}</div>
    </div>
  );
}

const nodeTypes = { flowBox: FlowBox, brainFlow: BrainFlow };
const fmt = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} kW`;

interface Props { state: SimulationState; design: SystemDesign; }

export function EnergyFlow({ state: s, design }: Props) {
  const { nodes, edges } = useMemo(() => {
    const onGrid = design.profile.gridScenario === 'on_grid';
    const hasGen = !!design.generator;
    const critPct = design.profile.criticalLoadPct ?? 20;
    const critKw = s.loadKw * (critPct / 100);
    const shiftKw = s.loadKw - critKw;
    const pvOn = s.solarKw > 0.1;
    const battOn = s.batteryChargeKw + s.batteryDischargeKw > 0.1;
    const gridOn = s.gridKw + s.gridExportKw > 0.1;
    const genOn = s.generatorKw > 0.1;

    const nodes: Node<BoxData>[] = [
      { id: 'pv', type: 'flowBox', position: { x: 0, y: 0 }, data: { title: 'SOLAR PV', value: fmt(s.solarKw), bg: '#FFF8E7', border: '#D4A42B', tc: '#B8860B', active: pvOn, handles: ['right', 'bottom'] } },
      { id: 'inv', type: 'flowBox', position: { x: 300, y: 0 }, data: { title: 'INVERTER', value: fmt(s.pvOutputKw), bg: '#E8F5EC', border: '#2E8B57', tc: '#2E8B57', active: pvOn || battOn, handles: ['left', 'right', 'bottom'] } },
      { id: 'crit', type: 'flowBox', position: { x: 620, y: 0 }, data: { title: 'CRITICAL LOADS', value: fmt(critKw), bg: '#F0ECFA', border: '#6C5CE7', tc: '#6C5CE7', active: true, handles: ['left'] } },
      { id: 'batt', type: 'flowBox', position: { x: 0, y: 220 }, data: { title: `BATTERY · ${s.batterySocPct}%`, value: fmt(s.batteryDischargeKw > 0 ? s.batteryDischargeKw : s.batteryChargeKw), bg: '#E8F4FD', border: '#3498DB', tc: '#3498DB', active: battOn, handles: ['right', 'bottom'] } },
      { id: 'brain', type: 'brainFlow', position: { x: 280, y: 210 }, data: { title: 'CONTROLLER', value: `Mode: ${s.mode}`, bg: '#0D1B2A', border: '#C8932E', tc: '#C8932E', active: true } },
      { id: 'shift', type: 'flowBox', position: { x: 600, y: 220 }, data: { title: 'SHIFTABLE LOADS', value: fmt(shiftKw), bg: '#F0ECFA', border: '#6C5CE7', tc: '#6C5CE7', active: shiftKw > 0.1, handles: ['left'] } },
    ];

    if (onGrid) {
      const exporting = s.gridExportKw > 0;
      nodes.push({ id: 'grid', type: 'flowBox', position: { x: 280, y: 430 }, data: {
        title: exporting ? 'GRID ← EXPORT' : 'SEC GRID',
        value: fmt(s.gridKw + s.gridExportKw),
        bg: s.gridAvailable ? '#F0F0F0' : '#FDE8E8', border: s.gridAvailable ? '#95A5A6' : '#A32D2D', tc: s.gridAvailable ? '#7F8C8D' : '#A32D2D', active: gridOn || !s.gridAvailable, handles: ['top'],
      } });
    } else if (hasGen) {
      nodes.push({ id: 'gen', type: 'flowBox', position: { x: 280, y: 430 }, data: { title: 'GENERATOR', value: fmt(s.generatorKw), bg: '#FFF3E0', border: '#E67E22', tc: '#D35400', active: genOn, handles: ['top'] } });
    }

    const mk = (id: string, src: string, tgt: string, sh: string, th: string, color: string, active: boolean, label?: string): Edge => ({
      id, source: src, target: tgt, sourceHandle: sh, targetHandle: th, type: 'smoothstep', animated: active,
      label, labelStyle: label ? { fontSize: 10, fontWeight: 600, fill: color } : undefined,
      style: { stroke: color, strokeWidth: active ? 2.5 : 1, opacity: active ? 1 : 0.2 },
    });

    const edges: Edge[] = [
      mk('e1', 'pv', 'inv', 'right', 'left', '#D4A42B', pvOn, 'DC'),
      mk('e2', 'inv', 'crit', 'right', 'left', '#374151', true, 'Always on'),
      mk('e3', 'inv', 'brain', 'bottom', 'top', '#2E8B57', pvOn || battOn, 'AC bus'),
      mk('e4', 'batt', 'brain', 'right', 'left', '#3498DB', battOn, battOn ? (s.batteryDischargeKw > 0 ? 'Discharge' : 'Charge') : ''),
      mk('e5', 'brain', 'shift', 'right', 'left', '#6C5CE7', shiftKw > 0.1, 'Dispatch'),
    ];
    if (onGrid) edges.push(mk('e6', 'brain', 'grid', 'bottom', 'top', s.gridAvailable ? '#95A5A6' : '#A32D2D', gridOn, s.gridExportKw > 0 ? 'Export' : 'Import'));
    else if (hasGen) edges.push(mk('e6', 'brain', 'gen', 'bottom', 'top', '#E67E22', genOn, 'Backup'));

    return { nodes, edges };
  }, [s, design]);

  return (
    <div className="diagram-wrap">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} connectionLineType={ConnectionLineType.SmoothStep}
        fitView fitViewOptions={{ padding: 0.12 }} proOptions={{ hideAttribution: true }}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false}>
        <Background gap={14} size={1} color="#E5E7EB" />
      </ReactFlow>
    </div>
  );
}
