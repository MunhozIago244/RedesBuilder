import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Router } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const RouterNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Router size={28} strokeWidth={1.5} />}
    accentColor="text-cyan-400"
    accentBorder="border-cyan-500/60"
    glowColor="shadow-cyan-500/20"
  />
));

RouterNode.displayName = "RouterNode";
export default RouterNode;
