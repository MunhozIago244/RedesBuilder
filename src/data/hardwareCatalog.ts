// ─── Hardware Catalog (Legacy Re-export) ────────────────────────────────────
// Este arquivo redireciona para o novo deviceLibrary.ts.
// Mantido para compatibilidade reversa — qualquer import existente continua válido.

export {
  DEVICE_LIBRARY as HARDWARE_CATALOG,
  createInterfacesFromBlueprint,
  getHardwareModel,
  getDefaultModelForType,
  getModelsForType,
} from "@/data/deviceLibrary";
