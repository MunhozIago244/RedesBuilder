import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Cloud } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const CloudNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Cloud size={28} strokeWidth={1.5} />}
    accentColor="text-sky-400"
    accentBorder="border-sky-500/60"
    glowColor="shadow-sky-500/20"
  />
));

CloudNode.displayName = "CloudNode";
export default CloudNode;
