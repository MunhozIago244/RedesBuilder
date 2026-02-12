import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Speaker } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SmartSpeakerNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Speaker size={28} strokeWidth={1.5} />}
    accentColor="text-pink-400"
    accentBorder="border-pink-500/60"
    glowColor="shadow-pink-500/20"
  />
));

SmartSpeakerNode.displayName = "SmartSpeakerNode";
export default SmartSpeakerNode;
