import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Monitor } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const PCNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Monitor size={28} strokeWidth={1.5} />}
    accentColor="text-emerald-400"
    accentBorder="border-emerald-500/60"
    glowColor="shadow-emerald-500/20"
  />
));

PCNode.displayName = "PCNode";
export default PCNode;
