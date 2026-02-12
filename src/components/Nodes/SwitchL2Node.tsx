import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Network } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SwitchL2Node = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Network size={28} strokeWidth={1.5} />}
    accentColor="text-blue-400"
    accentBorder="border-blue-500/60"
    glowColor="shadow-blue-500/20"
  />
));

SwitchL2Node.displayName = "SwitchL2Node";
export default SwitchL2Node;
