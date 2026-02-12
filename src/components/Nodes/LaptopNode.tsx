import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Laptop } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const LaptopNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Laptop size={28} strokeWidth={1.5} />}
    accentColor="text-green-400"
    accentBorder="border-green-500/60"
    glowColor="shadow-green-500/20"
  />
));

LaptopNode.displayName = "LaptopNode";
export default LaptopNode;
