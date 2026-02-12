// ─── ArchBuilder Node Types Registry ────────────────────────────────────────
// Todos os tipos de componente renderizam o mesmo ArchBaseNode.
// O React Flow usa o `type` do node para escolher o componente correto.

import type { NodeTypes } from "reactflow";
import ArchBaseNode from "./ArchBaseNode";

/**
 * Registro de todos os tipos de nó do Architecture Builder.
 * Como todos usam o mesmo componente visual, mapeamos cada tipo para ArchBaseNode.
 */
export const archNodeTypes: NodeTypes = {
  // Frontend
  browser: ArchBaseNode,
  "spa-app": ArchBaseNode,
  "mobile-app": ArchBaseNode,
  cdn: ArchBaseNode,
  "static-site": ArchBaseNode,
  // API Layer
  "api-gateway": ArchBaseNode,
  "rest-api": ArchBaseNode,
  "graphql-api": ArchBaseNode,
  "websocket-server": ArchBaseNode,
  bff: ArchBaseNode,
  // Backend / Services
  microservice: ArchBaseNode,
  monolith: ArchBaseNode,
  "serverless-fn": ArchBaseNode,
  worker: ArchBaseNode,
  "auth-service": ArchBaseNode,
  // Data Storage
  "database-sql": ArchBaseNode,
  "database-nosql": ArchBaseNode,
  cache: ArchBaseNode,
  "search-engine": ArchBaseNode,
  "object-storage": ArchBaseNode,
  // Messaging
  "message-queue": ArchBaseNode,
  "event-bus": ArchBaseNode,
  "pub-sub": ArchBaseNode,
  // Infrastructure
  "load-balancer": ArchBaseNode,
  "reverse-proxy": ArchBaseNode,
  dns: ArchBaseNode,
  "firewall-waf": ArchBaseNode,
  container: ArchBaseNode,
  orchestrator: ArchBaseNode,
  "ci-cd": ArchBaseNode,
};
