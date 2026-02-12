import { memo } from "react";
import { type NodeProps } from "reactflow";
import { Printer } from "lucide-react";
import type { NetworkDeviceData } from "@/types/network";
import BaseNode from "./BaseNode";

const PrinterNode = memo((props: NodeProps<NetworkDeviceData>) => (
  <BaseNode
    {...props}
    icon={<Printer size={28} strokeWidth={1.5} />}
    accentColor="text-amber-400"
    accentBorder="border-amber-500/60"
    glowColor="shadow-amber-500/20"
  />
));

PrinterNode.displayName = "PrinterNode";
export default PrinterNode;
