import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Server } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const ServerNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Server size={28} strokeWidth={1.5} />}
    accentColor="text-purple-400"
    accentBorder="border-purple-500/60"
    glowColor="shadow-purple-500/20"
  />
));

ServerNode.displayName = "ServerNode";
export default ServerNode;
