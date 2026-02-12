import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Thermometer } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SmartThermostatNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Thermometer size={28} strokeWidth={1.5} />}
    accentColor="text-orange-400"
    accentBorder="border-orange-500/60"
    glowColor="shadow-orange-500/20"
  />
));

SmartThermostatNode.displayName = "SmartThermostatNode";
export default SmartThermostatNode;
