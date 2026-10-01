import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type DemoReporter = { id: string; name: string; role: string };
type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: string;
    createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isDemoReporter(value: unknown): value is DemoReporter {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        value.name === 'Alya Pratama' &&
        value.role === 'civitas'
    );
}

function isReport(value: unknown): value is Report {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.reportCode === 'string' &&
        typeof value.title === 'string' &&
        typeof value.category === 'string' &&
        typeof value.location === 'string' &&
        typeof value.priority === 'string' &&
        typeof value.status === 'string' &&
        typeof value.createdAt === 'string'
    );
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function messageFrom(payload: unknown, fallback: string): string {
    return isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : fallback;
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleString();
}

export default function MyReports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadReports() {
            setLoading(true);
            setError('');

            try {
                const usersResponse = await fetch('/api/users', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const usersPayload: unknown = await readJson(usersResponse);

                if (!usersResponse.ok || !Array.isArray(usersPayload)) {
                    throw new Error(
                        messageFrom(
                            usersPayload,
                            'Could not load the demo account.',
                        ),
                    );
                }

                const reporter = usersPayload.find(isDemoReporter);
                if (!reporter) {
                    throw new Error(
                        'The seeded Civitas account Alya Pratama was not found.',
                    );
                }

                const params = new URLSearchParams({ reporterId: reporter.id });
                const reportsResponse = await fetch(
                    `/api/reports?${params.toString()}`,
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );
                const reportsPayload: unknown = await readJson(reportsResponse);

                if (
                    !reportsResponse.ok ||
                    !Array.isArray(reportsPayload) ||
                    !reportsPayload.every(isReport)
                ) {
                    throw new Error(
                        messageFrom(
                            reportsPayload,
                            'Could not load your reports.',
                        ),
                    );
                }

                setReports(reportsPayload);
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'A network error prevented your reports from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadReports();
        return () => controller.abort();
    }, []);

    return (
        <>
            <Head title="My reports" />
            <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
                <div className="mx-auto max-w-5xl">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <a
                                href="/"
                                className="text-sm font-semibold text-blue-700"
                            >
                                ← CampusFix home
                            </a>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                                My reports
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">
                                Reports submitted by Alya Pratama.
                            </p>
                        </div>
                        <a
                            href="/reports/create"
                            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                            Report an issue
                        </a>
                    </header>

                    {loading && (
                        <section
                            className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
                            role="status"
                        >
                            Loading your reports…
                        </section>
                    )}

                    {!loading && error && (
                        <section
                            className="mt-6 rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700"
                            role="alert"
                        >
                            {error}
                        </section>
                    )}

                    {!loading && !error && reports.length === 0 && (
                        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
                            <h2 className="font-semibold">No reports yet</h2>
                            <p className="mt-2 text-sm text-slate-600">
                                Reports you submit will appear here.
                            </p>
                        </section>
                    )}

                    {!loading && !error && reports.length > 0 && (
                        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-slate-100 text-xs tracking-wide text-slate-600 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Report</th>
                                        <th className="px-4 py-3">
                                            Category / Location
                                        </th>
                                        <th className="px-4 py-3">Priority</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reports.map((report) => (
                                        <tr key={report.id}>
                                            <td className="px-4 py-4">
                                                <a
                                                    href={`/reports/${encodeURIComponent(report.id)}`}
                                                    className="font-semibold text-blue-700 hover:text-blue-900"
                                                >
                                                    {report.reportCode}
                                                </a>
                                                <p className="mt-1 font-medium text-slate-900">
                                                    {report.title}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">
                                                <p>{report.category}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {report.location}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 capitalize">
                                                {report.priority}
                                            </td>
                                            <td className="px-4 py-4 capitalize">
                                                {report.status.replaceAll(
                                                    '_',
                                                    ' ',
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {formatDate(report.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
