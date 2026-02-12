import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Wifi } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const AccessPointNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Wifi size={28} strokeWidth={1.5} />}
    accentColor="text-teal-400"
    accentBorder="border-teal-500/60"
    glowColor="shadow-teal-500/20"
  />
));

AccessPointNode.displayName = "AccessPointNode";
export default AccessPointNode;
