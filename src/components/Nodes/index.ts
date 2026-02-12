// ─── Node Types Registry ────────────────────────────────────────────────────
// Registra todos os tipos de nós customizados para o React Flow.
// Extensibilidade: adicionar novo dispositivo = novo import + 1 linha.

import type { NodeTypes } from "reactflow";
import RouterNode from "./RouterNode";
import SwitchL2Node from "./SwitchL2Node";
import SwitchL3Node from "./SwitchL3Node";
import AccessPointNode from "./AccessPointNode";
import PCNode from "./PCNode";
import LaptopNode from "./LaptopNode";
import IPPhoneNode from "./IPPhoneNode";
import ServerNode from "./ServerNode";
import PrinterNode from "./PrinterNode";
import ISPNode from "./ISPNode";
import CloudNode from "./CloudNode";
import FirewallNode from "./FirewallNode";
import SmartTVNode from "./SmartTVNode";
import SmartSpeakerNode from "./SmartSpeakerNode";
import SmartLightNode from "./SmartLightNode";
import SecurityCameraNode from "./SecurityCameraNode";
import RobotVacuumNode from "./RobotVacuumNode";
import SmartThermostatNode from "./SmartThermostatNode";
import GameConsoleNode from "./GameConsoleNode";
import StreamingBoxNode from "./StreamingBoxNode";

export const nodeTypes: NodeTypes = {
  router: RouterNode,
  "switch-l2": SwitchL2Node,
  "switch-l3": SwitchL3Node,
  "access-point": AccessPointNode,
  pc: PCNode,
  laptop: LaptopNode,
  "ip-phone": IPPhoneNode,
  server: ServerNode,
  printer: PrinterNode,
  isp: ISPNode,
  cloud: CloudNode,
  firewall: FirewallNode,
  "smart-tv": SmartTVNode,
  "smart-speaker": SmartSpeakerNode,
  "smart-light": SmartLightNode,
  "security-camera": SecurityCameraNode,
  "robot-vacuum": RobotVacuumNode,
  "smart-thermostat": SmartThermostatNode,
  "game-console": GameConsoleNode,
  "streaming-box": StreamingBoxNode,
};
