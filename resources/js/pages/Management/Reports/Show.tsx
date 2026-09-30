import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Props = {
    reportId: string;
};

type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: string;
    description: string;
};

type WorkLog = {
    id: string;
    status: string;
    note: string;
    createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
        typeof value.description === 'string'
    );
}

function isWorkLog(value: unknown): value is WorkLog {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.status === 'string' &&
        typeof value.note === 'string' &&
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

export default function Show({ reportId }: Props) {
    const [report, setReport] = useState<Report | null>(null);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadReport() {
            setLoading(true);
            setError('');

            try {
                const encodedId = encodeURIComponent(reportId);
                const [reportResponse, logsResponse] = await Promise.all([
                    fetch(`/api/reports/${encodedId}`, {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    }),
                    fetch(`/api/reports/${encodedId}/work-logs`, {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    }),
                ]);
                const [reportPayload, logsPayload] = await Promise.all([
                    readJson(reportResponse),
                    readJson(logsResponse),
                ]);

                if (!reportResponse.ok || !isReport(reportPayload)) {
                    throw new Error(
                        messageFrom(
                            reportPayload,
                            reportResponse.status === 404
                                ? 'Report not found.'
                                : 'Could not load report details.',
                        ),
                    );
                }

                if (
                    !logsResponse.ok ||
                    !Array.isArray(logsPayload) ||
                    !logsPayload.every(isWorkLog)
                ) {
                    throw new Error(
                        messageFrom(logsPayload, 'Could not load work logs.'),
                    );
                }

                setReport(reportPayload);
                setWorkLogs(logsPayload);
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Could not load this report.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadReport();
        return () => controller.abort();
    }, [reportId]);

    return (
        <>
            <Head title={report?.reportCode ?? 'Report details'} />
            <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900">
                <div className="mx-auto max-w-3xl">
                    <a
                        href="/management"
                        className="text-sm font-medium text-blue-700 hover:underline"
                    >
                        ← Back to management
                    </a>

                    {loading && (
                        <p
                            className="mt-5 rounded-lg bg-white p-5 text-sm text-slate-600 shadow-sm"
                            role="status"
                        >
                            Loading report…
                        </p>
                    )}

                    {!loading && error && (
                        <p
                            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    {!loading && !error && report && (
                        <div className="mt-5 space-y-5">
                            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-sm font-semibold text-blue-700">
                                    {report.reportCode}
                                </p>
                                <h1 className="mt-2 text-2xl font-semibold">
                                    {report.title}
                                </h1>
                                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-sm text-slate-500">
                                            Category
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {report.category}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-slate-500">
                                            Location
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {report.location}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-slate-500">
                                            Priority
                                        </dt>
                                        <dd className="mt-1 font-medium capitalize">
                                            {report.priority}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-slate-500">
                                            Status
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {report.status.replaceAll('_', ' ')}
                                        </dd>
                                    </div>
                                </dl>
                                <div className="mt-5 border-t border-slate-100 pt-4">
                                    <h2 className="text-sm font-medium text-slate-500">
                                        Description
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                                        {report.description}
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Work logs
                                </h2>
                                {workLogs.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-500">
                                        No work logs found.
                                    </p>
                                ) : (
                                    <ul className="mt-4 divide-y divide-slate-100">
                                        {workLogs.map((log) => (
                                            <li
                                                key={log.id}
                                                className="py-4 first:pt-0 last:pb-0"
                                            >
                                                <p className="font-medium capitalize">
                                                    {log.status.replaceAll(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700">
                                                    {log.note}
                                                </p>
                                                <time className="mt-2 block text-xs text-slate-500">
                                                    {new Date(
                                                        log.createdAt,
                                                    ).toLocaleString()}
                                                </time>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
