import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Shield } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const FirewallNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Shield size={28} strokeWidth={1.5} />}
    accentColor="text-red-400"
    accentBorder="border-red-500/60"
    glowColor="shadow-red-500/20"
  />
));

FirewallNode.displayName = "FirewallNode";
export default FirewallNode;
