import { createFileRoute } from "@tanstack/react-router";
import { StudioApp } from "@/components/studio/StudioApp";

type Search = { template?: string };

export const Route = createFileRoute("/studio")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    template: typeof raw.template === "string" ? raw.template : undefined,
  }),
  component: StudioPage,
});

function StudioPage() {
  const { template } = Route.useSearch();
  return <StudioApp template={template} />;
}
