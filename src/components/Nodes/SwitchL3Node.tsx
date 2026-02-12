import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Network } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SwitchL3Node = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Network size={28} strokeWidth={1.5} />}
    accentColor="text-indigo-400"
    accentBorder="border-indigo-500/60"
    glowColor="shadow-indigo-500/20"
  />
));

SwitchL3Node.displayName = "SwitchL3Node";
export default SwitchL3Node;
