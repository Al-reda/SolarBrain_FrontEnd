/**
 * EnergyFlow.tsx — live energy-flow diagram. Reuses the same layout as
 * the static SystemDiagram but animates edges and shows live kW values
 * on each connection. Active edges (>0.1 kW) animate; idle edges are
 * dimmed. Color reflects the source type.
 */

import { useMemo } from 'react';
import ReactFlow, {
  Background, ConnectionLineType, Handle, Position,
  type Edge, type Node, type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { SimulationState, SystemDesign } from '../types/api';

interface BoxData {
  title:    string;
  value:    string;
  color:    string;
  active:   boolean;
  side?:    'left' | 'right' | 'both';
}

function FlowBox({ data }: NodeProps<BoxData>) {
  return (
    <div
      className={`flow-box ${data.active ? 'flow-box--active' : ''}`}
      style={{ borderColor: data.color }}
    >
      {(data.side === 'left' || data.side === 'both') && (
        <Handle type="target" position={Position.Left} style={{ background: data.color }} />
      )}
      <div className="flow-box__title" style={{ color: data.color }}>{data.title}</div>
      <div className="flow-box__value">{data.value}</div>
      {(data.side === 'right' || data.side === 'both' || !data.side) && (
        <Handle type="source" position={Position.Right} style={{ background: data.color }} />
      )}
    </div>
  );
}

const nodeTypes = { flowBox: FlowBox };

const fmt = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} kW`;

interface Props {
  state:  SimulationState;
  design: SystemDesign;
}

export function EnergyFlow({ state, design }: Props) {
  const { nodes, edges } = useMemo(() => {
    const onGrid = design.profile.gridScenario === 'on_grid';
    const hasGen = !!design.generator;

    // Active = >0.1 kW on that source
    const pvActive   = state.solarKw            > 0.1;
    const battActive = state.batteryChargeKw + state.batteryDischargeKw > 0.1;
    const gridActive = state.gridKw + state.gridExportKw > 0.1;
    const genActive  = state.generatorKw         > 0.1;

    const nodes: Node<BoxData>[] = [
      {
        id: 'pv', type: 'flowBox', position: { x: 0, y: 100 },
        data: { title: 'SOLAR', value: fmt(state.solarKw), color: '#BA7517', active: pvActive },
      },
      {
        id: 'inv', type: 'flowBox', position: { x: 260, y: 100 },
        data: { title: 'INVERTER', value: fmt(state.pvOutputKw), color: '#374151', active: pvActive || battActive || gridActive, side: 'both' },
      },
      {
        id: 'batt', type: 'flowBox', position: { x: 260, y: 220 },
        data: {
          title: 'BATTERY',
          value: `${state.batterySocPct}%  ·  ${fmt(state.batteryDischargeKw > 0 ? state.batteryDischargeKw : state.batteryChargeKw)}`,
          color: '#534AB7', active: battActive, side: 'left',
        },
      },
      {
        id: 'load', type: 'flowBox', position: { x: 540, y: 100 },
        data: { title: 'LOAD', value: fmt(state.loadKw), color: '#111827', active: true, side: 'left' },
      },
    ];

    if (onGrid) {
      nodes.push({
        id: 'grid', type: 'flowBox', position: { x: 540, y: 220 },
        data: {
          title: state.gridExportKw > 0 ? 'GRID ← EXPORT' : 'SEC GRID',
          value: fmt(state.gridKw + state.gridExportKw),
          color: state.gridAvailable ? '#185FA5' : '#A32D2D',
          active: gridActive || !state.gridAvailable,
          side: 'left',
        },
      });
    } else if (hasGen) {
      nodes.push({
        id: 'gen', type: 'flowBox', position: { x: 540, y: 220 },
        data: {
          title: 'GENERATOR',
          value: fmt(state.generatorKw),
          color: '#6B7280',
          active: genActive,
          side: 'left',
        },
      });
    }

    const edges: Edge[] = [
      edge('pv',  'inv',  '#BA7517', pvActive),
      edge('inv', 'load', '#111827', true),
      edge('inv', 'batt', '#534AB7', battActive),
    ];
    if (onGrid) {
      edges.push(edge('inv', 'grid', state.gridAvailable ? '#185FA5' : '#A32D2D', gridActive || !state.gridAvailable));
    } else if (hasGen) {
      edges.push(edge('inv', 'gen', '#6B7280', genActive));
    }

    return { nodes, edges };
  }, [state, design]);

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
        panOnDrag={false}
        zoomOnScroll={false}
      >
        <Background gap={14} size={1} color="#E5E7EB" />
      </ReactFlow>
    </div>
  );
}

function edge(source: string, target: string, color: string, active: boolean): Edge {
  return {
    id: `e-${source}-${target}`,
    source, target,
    type: 'smoothstep',
    animated: active,
    style: {
      stroke: color,
      strokeWidth: active ? 2.5 : 1,
      opacity: active ? 1 : 0.25,
    },
  };
}
