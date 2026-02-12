import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Globe } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const ISPNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Globe size={28} strokeWidth={1.5} />}
    accentColor="text-rose-400"
    accentBorder="border-rose-500/60"
    glowColor="shadow-rose-500/20"
  />
));

ISPNode.displayName = "ISPNode";
export default ISPNode;
