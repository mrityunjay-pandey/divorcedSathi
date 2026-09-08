import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-24 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-serif sm:text-5xl">
          A New Beginning Starts With the Right Sathi.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-neutral-600">
          DivorcedSathi.com helps you meet genuine people who are ready for a meaningful second
          chapter.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg">Create Your Profile</Button>
        <Button size="lg" variant="outline">
          Find Your Sathi
        </Button>
      </div>

      <Card className="max-w-lg text-left">
        <CardContent>
          <p className="text-sm text-neutral-500">
            This is the Module 1 scaffold: routing, the design system, and the base primitives are
            in place. The full multi-section landing page (Trust, How It Works, Why
            DivorcedSathi, Success Stories, FAQ) is built out as part of the landing-page module.
          </p>
        </CardContent>
      </Card>

      <Link href="/style-guide" className="text-sm font-medium text-primary-600 hover:underline">
        View component style guide →
      </Link>
    </main>
  );
}
