import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Camera } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const SecurityCameraNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Camera size={28} strokeWidth={1.5} />}
    accentColor="text-red-400"
    accentBorder="border-red-500/60"
    glowColor="shadow-red-500/20"
  />
));

SecurityCameraNode.displayName = "SecurityCameraNode";
export default SecurityCameraNode;
