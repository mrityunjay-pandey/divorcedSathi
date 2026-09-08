import { Button } from "@/components/ui/Button";

export function ComingSoonStep({ title, onSkip }: { title: string; onSkip: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">{title}</h2>
        <p className="text-sm text-neutral-500">
          This step isn't built yet — it lands in a later module (see docs/ROADMAP.md). You can
          continue on for now and come back once it ships.
        </p>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSkip} variant="outline">
          Continue
        </Button>
      </div>
    </div>
  );
}
