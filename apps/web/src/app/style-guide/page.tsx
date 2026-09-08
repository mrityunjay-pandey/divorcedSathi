"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Dropdown } from "@/components/ui/Dropdown";

/**
 * Internal-only style guide. Not linked from public navigation once the real
 * landing page ships; kept for manual QA per docs/ROADMAP.md's "Module 1"
 * checklist and for future component additions to have a home to render in.
 */
export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [city, setCity] = useState<string | undefined>();
  const { show } = useToast();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-16">
      <header>
        <h1 className="text-3xl">Design System — Style Guide</h1>
        <p className="text-neutral-500">Module 1 QA reference. Not a public page.</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Inputs</h2>
        <Input label="First name" placeholder="e.g. Ananya" />
        <Input label="Email" hint="We'll send a verification code here." />
        <Input label="Mobile number" error="This field is required." required />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Dropdown</h2>
        <Dropdown
          label="City"
          value={city}
          onChange={setCity}
          placeholder="Select a city"
          items={[
            { label: "Mumbai", value: "mumbai" },
            { label: "Delhi", value: "delhi" },
            { label: "Bengaluru", value: "bengaluru" },
            { label: "Prefer not to say", value: "unspecified" },
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Card</h2>
        <Card>
          <CardHeader>
            <CardTitle>Priya, 34</CardTitle>
            <CardDescription>Pune · Previously married · Divorce finalized</CardDescription>
          </CardHeader>
          <CardContent>Software engineer. Looking for a genuine life partner.</CardContent>
          <CardFooter>
            <Button size="sm">Send Interest</Button>
            <Button size="sm" variant="outline">
              Shortlist
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">Identity Verified</Badge>
          <Badge tone="success">Mobile Verified</Badge>
          <Badge tone="info">Email Verified</Badge>
          <Badge tone="neutral">Prefer not to say</Badge>
          <Badge tone="warning">Pending Review</Badge>
          <Badge tone="danger">Reported</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Tabs</h2>
        <Tabs defaultValue="about">
          <TabList>
            <Tab value="about">About</Tab>
            <Tab value="family">Family</Tab>
            <Tab value="preferences">Preferences</Tab>
          </TabList>
          <TabPanel value="about">About Me content goes here.</TabPanel>
          <TabPanel value="family">Family & children details go here.</TabPanel>
          <TabPanel value="preferences">Partner preferences go here.</TabPanel>
        </Tabs>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Alerts</h2>
        <Alert tone="info" title="Safety reminder">
          Take your time getting to know someone. Never send money to someone you met online.
        </Alert>
        <Alert tone="warning" title="Verification pending">
          Your identity verification is under review.
        </Alert>
        <Alert tone="danger" title="Action required">
          This account has been reported and is under moderation review.
        </Alert>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Toasts</h2>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => show({ title: "Interest sent", description: "We'll notify you if they respond.", tone: "success" })}
          >
            Trigger success toast
          </Button>
          <Button
            variant="outline"
            onClick={() => show({ title: "Something went wrong", tone: "danger" })}
          >
            Trigger error toast
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Skeleton / Loading</h2>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Empty / Error states</h2>
        <EmptyState
          title="No matches yet"
          description="Once you complete your partner preferences, we'll show compatible profiles here."
          action={<Button size="sm">Set Partner Preferences</Button>}
        />
        <ErrorState
          title="Couldn't load profiles"
          description="Something went wrong on our end. Please try again."
          action={
            <Button size="sm" variant="outline">
              Retry
            </Button>
          }
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Report this profile"
          description="Tell us what's wrong. Our moderation team reviews every report."
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>
              Submit report
            </Button>
          </div>
        </Modal>
      </section>
    </main>
  );
}
