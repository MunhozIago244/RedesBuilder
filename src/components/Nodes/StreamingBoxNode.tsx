import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Cast } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const StreamingBoxNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Cast size={28} strokeWidth={1.5} />}
    accentColor="text-rose-400"
    accentBorder="border-rose-500/60"
    glowColor="shadow-rose-500/20"
  />
));

StreamingBoxNode.displayName = "StreamingBoxNode";
export default StreamingBoxNode;
