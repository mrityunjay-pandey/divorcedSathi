import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

const TIPS = [
  "Take your time getting to know someone before making plans to meet.",
  "Never send money, gift cards, or financial details to someone you've met online.",
  "Meet in a public place for the first few times, and tell a friend or family member your plans.",
  "Video chat before meeting in person to help confirm who you're talking to.",
  "Trust your instincts — if something feels off, it's okay to step back or stop responding.",
  "Keep sensitive personal and financial information private until real trust is established.",
];

export default function SafetyCenterPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Safety Center</h1>
        <p className="text-sm text-neutral-500">Guidance for a safe, respectful experience.</p>
      </div>

      <Alert tone="danger" title="If you're in immediate danger">
        Contact local emergency services right away. This platform can't respond to active
        emergencies.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Staying safe while getting to know someone</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm text-neutral-700">
            {TIPS.map((tip) => (
              <li key={tip}>• {tip}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reporting and blocking</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-neutral-700">
          <p>
            You can report any profile or message directly from its page — look for the "Report"
            option. Reports are reviewed by our moderation team.
          </p>
          <p>
            Blocking someone immediately stops them from viewing your profile, messaging you, or
            sending you interests, in both directions. You can manage blocked users anytime from{" "}
            <span className="font-medium">Settings → Blocked Users</span>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your privacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-700">
          <p>
            You control who sees your income, divorce details, children details, and photos from{" "}
            <span className="font-medium">Settings → Privacy</span>. Your email and mobile number
            are never shown to other members.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
