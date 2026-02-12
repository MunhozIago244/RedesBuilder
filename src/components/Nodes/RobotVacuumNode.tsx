import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Bot } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const RobotVacuumNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Bot size={28} strokeWidth={1.5} />}
    accentColor="text-teal-400"
    accentBorder="border-teal-500/60"
    glowColor="shadow-teal-500/20"
  />
));

RobotVacuumNode.displayName = "RobotVacuumNode";
export default RobotVacuumNode;
