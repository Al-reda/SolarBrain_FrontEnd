/**
 * SystemDiagram.tsx — auto-generated single-line diagram using React Flow.
 * Shows: PV array → inverter → load, with battery branch, grid branch,
 * and (off-grid) generator branch. Nodes carry the selected components'
 * specs so the diagram reflects the actual design.
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

// ── Custom node renderer ───────────────────────────────────────────────────

interface BoxData {
  title:    string;
  subtitle: string;
  color:    string;
  side?:    'left' | 'right' | 'both';
}

function Box({ data }: NodeProps<BoxData>) {
  return (
    <div
      className="diagram-box"
      style={{ borderColor: data.color, boxShadow: `0 0 0 1px ${data.color}22 inset` }}
    >
      {(data.side === 'left' || data.side === 'both') && (
        <Handle type="target" position={Position.Left} style={{ background: data.color }} />
      )}
      <div className="diagram-box__title" style={{ color: data.color }}>{data.title}</div>
      <div className="diagram-box__sub">{data.subtitle}</div>
      {(data.side === 'right' || data.side === 'both' || !data.side) && (
        <Handle type="source" position={Position.Right} style={{ background: data.color }} />
      )}
    </div>
  );
}

const nodeTypes = { box: Box };

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
    [panel, inverter, battery, generator, gridScenario]
  );

  return (
    <div className="diagram-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
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

  const nodes: Node<BoxData>[] = [
    {
      id: 'pv', type: 'box', position: { x: 0, y: 100 },
      data: {
        title: 'PV ARRAY',
        subtitle: `${panel.actualKwp} kWp  ·  ${panel.unitsRequired} × ${panel.powerWp} Wp\n${panel.brand}`,
        color: '#BA7517',
      },
    },
    {
      id: 'inv', type: 'box', position: { x: 260, y: 100 },
      data: {
        title: 'INVERTER',
        subtitle: `${inverter.actualKw} kW  ·  ${inverter.unitsRequired}× ${inverter.capacityKw}kW\n${inverter.brand}`,
        color: '#374151',
        side: 'both',
      },
    },
    {
      id: 'batt', type: 'box', position: { x: 260, y: 220 },
      data: {
        title: 'BATTERY',
        subtitle: `${battery.actualKwh} kWh  ·  ${battery.unitsRequired}× ${battery.capacityKwh}kWh\n${battery.chemistry}`,
        color: '#534AB7',
        side: 'left',
      },
    },
    {
      id: 'load', type: 'box', position: { x: 540, y: 100 },
      data: { title: 'FACILITY LOAD', subtitle: 'Demand side', color: '#111827', side: 'left' },
    },
  ];

  if (!isOffGrid) {
    nodes.push({
      id: 'grid', type: 'box', position: { x: 540, y: 220 },
      data: { title: 'SEC GRID', subtitle: 'Bidirectional · net metering', color: '#185FA5', side: 'left' },
    });
  } else if (generator) {
    nodes.push({
      id: 'gen', type: 'box', position: { x: 540, y: 220 },
      data: {
        title: 'GENERATOR',
        subtitle: `${generator.kva} kVA · ${generator.fuelConsumptionLph} L/h`,
        color: '#6B7280', side: 'left',
      },
    });
  }

  const edges: Edge[] = [
    { id: 'e-pv-inv',   source: 'pv',   target: 'inv',  type: 'smoothstep', animated: false, style: { stroke: '#BA7517', strokeWidth: 2 } },
    { id: 'e-inv-load', source: 'inv',  target: 'load', type: 'smoothstep', animated: false, style: { stroke: '#111827', strokeWidth: 2 } },
    { id: 'e-inv-batt', source: 'inv',  target: 'batt', type: 'smoothstep', animated: false, style: { stroke: '#534AB7', strokeWidth: 2 } },
  ];

  if (!isOffGrid) {
    edges.push({
      id: 'e-inv-grid', source: 'inv', target: 'grid',
      type: 'smoothstep', style: { stroke: '#185FA5', strokeWidth: 2, strokeDasharray: '4 3' },
    });
  } else if (generator) {
    edges.push({
      id: 'e-inv-gen', source: 'inv', target: 'gen',
      type: 'smoothstep', style: { stroke: '#6B7280', strokeWidth: 2, strokeDasharray: '4 3' },
    });
  }

  return { nodes, edges };
}
