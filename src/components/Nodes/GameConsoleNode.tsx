import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Gamepad2 } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const GameConsoleNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Gamepad2 size={28} strokeWidth={1.5} />}
    accentColor="text-indigo-400"
    accentBorder="border-indigo-500/60"
    glowColor="shadow-indigo-500/20"
  />
));

GameConsoleNode.displayName = "GameConsoleNode";
export default GameConsoleNode;
