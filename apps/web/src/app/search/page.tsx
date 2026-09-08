"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api-client";
import type { SearchResult } from "@/types/profile";

interface FilterValues {
  minAge: string;
  maxAge: string;
  city: string;
  religion: string;
  education: string;
  profession: string;
}

const EMPTY_FILTERS: FilterValues = { minAge: "", maxAge: "", city: "", religion: "", education: "", profession: "" };

function buildQueryString(filters: FilterValues, page: number): string {
  const params = new URLSearchParams();
  if (filters.minAge) params.set("minAge", filters.minAge);
  if (filters.maxAge) params.set("maxAge", filters.maxAge);
  if (filters.city) params.set("city", filters.city);
  if (filters.religion) params.set("religion", filters.religion);
  if (filters.education) params.set("education", filters.education);
  if (filters.profession) params.set("profession", filters.profession);
  params.set("page", page.toString());
  return params.toString();
}

export default function SearchPage() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function runSearch(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SearchResult>(`/search/profiles?${buildQueryString(filters, targetPage)}`);
      setResult(data);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load search results. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(1);
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl">Search</h1>
        <p className="text-sm text-neutral-500">Find compatible profiles based on what matters to you.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <Input label="Min age" type="number" value={filters.minAge} onChange={(e) => set("minAge", e.target.value)} />
          <Input label="Max age" type="number" value={filters.maxAge} onChange={(e) => set("maxAge", e.target.value)} />
          <Input label="City" value={filters.city} onChange={(e) => set("city", e.target.value)} />
          <Input label="Religion" value={filters.religion} onChange={(e) => set("religion", e.target.value)} />
          <Input label="Education" value={filters.education} onChange={(e) => set("education", e.target.value)} />
          <Input label="Profession" value={filters.profession} onChange={(e) => set("profession", e.target.value)} />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" isLoading={loading}>
              Search
            </Button>
          </div>
        </form>
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && result && result.results.length === 0 && (
        <EmptyState title="No matches found" description="Try widening your filters." />
      )}

      {!loading && result && result.results.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.results.map((profile) => (
              <Card key={profile.profileId}>
                <CardHeader>
                  <CardTitle>
                    {profile.firstName}, {profile.age}
                  </CardTitle>
                  <CardDescription>
                    {[profile.city, profile.state].filter(Boolean).join(", ")}
                    {profile.previousMarriage && " · Previously married"}
                    {profile.previousMarriage?.divorceFinalized && " · Divorce finalized"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  {profile.profession && <p>{profile.profession}</p>}
                  {profile.education && <p className="text-neutral-500">{profile.education}</p>}
                  {profile.religion && <Badge tone="neutral">{profile.religion}</Badge>}
                </CardContent>
                <CardFooter>
                  <Button size="sm">Send Interest</Button>
                  <Button size="sm" variant="outline">
                    Shortlist
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              Page {page} of {totalPages} ({result.total} result{result.total === 1 ? "" : "s"})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => runSearch(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => runSearch(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
