// ─── CodeGeneratorRegistry.ts ────────────────────────────────────────────────
// Registry central que orquestra todos os geradores de código.

import type {
  CanvasDiagram,
  GeneratedArtifact,
  GenerationResult,
  GeneratorType,
} from "@/types/platform";
import { generateDockerCompose } from "./generators/DockerComposeGenerator";
import { generateKubernetes } from "./generators/KubernetesGenerator";
import { generateTerraform } from "./generators/TerraformGenerator";
import { generateNginx } from "./generators/NginxGenerator";

// ═══════════════════════════════════════════════════════════════════════════════

type GeneratorFn = (diagram: CanvasDiagram) => GeneratedArtifact;

const generators: Record<GeneratorType, GeneratorFn> = {
  "docker-compose": generateDockerCompose,
  kubernetes: generateKubernetes,
  terraform: generateTerraform,
  nginx: generateNginx,
  "code-skeleton": (d) => ({
    type: "code-skeleton",
    filename: "README.md",
    content: `# ${d.name}\n\nAutomatically generated project structure.\n\n## Components\n${d.components.map((c) => `- **${c.label}** (${c.type})`).join("\n")}\n`,
    language: "markdown",
  }),
};

export function generateSingle(
  type: GeneratorType,
  diagram: CanvasDiagram,
): GeneratedArtifact {
  const fn = generators[type];
  if (!fn) {
    throw new Error(
      `Generator "${type}" não registrado. Tipos válidos: ${Object.keys(generators).join(", ")}`,
    );
  }
  return fn(diagram);
}

export function generateAll(diagram: CanvasDiagram): GenerationResult {
  const warnings: string[] = [];
  const artifacts: GeneratedArtifact[] = [];

  const skipTypes = new Set([
    "browser",
    "mobile-app",
    "cdn",
    "static-site",
    "dns",
    "ci-cd",
    "container",
    "orchestrator",
  ]);
  const deployable = diagram.components.filter((c) => !skipTypes.has(c.type));

  if (deployable.length === 0) {
    warnings.push("Nenhum componente deployável encontrado no diagrama.");
  }

  for (const [type, fn] of Object.entries(generators)) {
    try {
      artifacts.push(fn(diagram));
    } catch (err) {
      warnings.push(
        `Falha ao gerar ${type}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    artifacts,
    warnings,
    componentsCovered: deployable.length,
    totalComponents: diagram.components.length,
  };
}
