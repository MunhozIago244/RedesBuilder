import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Tv } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SmartTVNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Tv size={28} strokeWidth={1.5} />}
    accentColor="text-violet-400"
    accentBorder="border-violet-500/60"
    glowColor="shadow-violet-500/20"
  />
));

SmartTVNode.displayName = "SmartTVNode";
export default SmartTVNode;
