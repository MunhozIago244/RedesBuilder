import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Lightbulb } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SmartLightNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Lightbulb size={28} strokeWidth={1.5} />}
    accentColor="text-yellow-400"
    accentBorder="border-yellow-500/60"
    glowColor="shadow-yellow-500/20"
  />
));

SmartLightNode.displayName = "SmartLightNode";
export default SmartLightNode;
