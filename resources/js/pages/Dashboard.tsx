import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const statuses = [
    'reported',
    'under_review',
    'assigned',
    'in_progress',
    'waiting_verification',
    'resolved',
    'reopened',
] as const;

type ReportStatus = (typeof statuses)[number];

type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: ReportStatus;
    createdAt?: string;
};

type Worker = {
    id: string;
    name: string;
    role: 'worker';
    department?: string | null;
};

type SummaryItem = {
    label: string;
    status?: ReportStatus;
};

const summaryItems: SummaryItem[] = [
    { label: 'Total reports' },
    { label: 'Reported', status: 'reported' },
    { label: 'Under review', status: 'under_review' },
    { label: 'Assigned', status: 'assigned' },
    { label: 'In progress', status: 'in_progress' },
    { label: 'Waiting verification', status: 'waiting_verification' },
    { label: 'Resolved', status: 'resolved' },
    { label: 'Reopened', status: 'reopened' },
];

const attentionStatuses: ReportStatus[] = [
    'reported',
    'waiting_verification',
    'reopened',
];

const statusStyles: Record<ReportStatus, string> = {
    reported: 'bg-slate-100 text-slate-700',
    under_review: 'bg-amber-100 text-amber-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    waiting_verification: 'bg-violet-100 text-violet-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    reopened: 'bg-rose-100 text-rose-800',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isReportStatus(value: unknown): value is ReportStatus {
    return (
        typeof value === 'string' && statuses.includes(value as ReportStatus)
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
        isReportStatus(value.status) &&
        (typeof value.createdAt === 'string' || value.createdAt === undefined)
    );
}

function isWorker(value: unknown): value is Worker {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        value.role === 'worker' &&
        (typeof value.department === 'string' ||
            value.department === null ||
            value.department === undefined)
    );
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function responseMessage(payload: unknown, fallback: string): string {
    return isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : fallback;
}

function formatDate(value?: string): string {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleString();
}

function statusLabel(status: ReportStatus): string {
    return status.replaceAll('_', ' ');
}

export default function Dashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workerId, setWorkerId] = useState('');
    const [reportsLoading, setReportsLoading] = useState(true);
    const [reportsError, setReportsError] = useState('');
    const [workersLoading, setWorkersLoading] = useState(true);
    const [workersError, setWorkersError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadReports() {
            try {
                const response = await fetch('/api/reports', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const payload: unknown = await readJson(response);

                if (
                    !response.ok ||
                    !Array.isArray(payload) ||
                    !payload.every(isReport)
                ) {
                    throw new Error(
                        responseMessage(payload, 'Could not load reports.'),
                    );
                }

                setReports(payload);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setReportsError(
                        error instanceof Error
                            ? error.message
                            : 'A network error prevented reports from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setReportsLoading(false);
            }
        }

        async function loadWorkers() {
            try {
                const response = await fetch('/api/workers', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const payload: unknown = await readJson(response);

                if (
                    !response.ok ||
                    !Array.isArray(payload) ||
                    !payload.every(isWorker)
                ) {
                    throw new Error(
                        responseMessage(
                            payload,
                            'Could not load demo workers.',
                        ),
                    );
                }

                setWorkers(payload);
                const requestedWorkerId = new URLSearchParams(
                    window.location.search,
                ).get('worker_id');
                if (
                    requestedWorkerId &&
                    payload.some((worker) => worker.id === requestedWorkerId)
                ) {
                    setWorkerId(requestedWorkerId);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setWorkersError(
                        error instanceof Error
                            ? error.message
                            : 'A network error prevented demo workers from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setWorkersLoading(false);
            }
        }

        void loadReports();
        void loadWorkers();

        return () => controller.abort();
    }, []);

    const counts = useMemo(() => {
        const result = new Map<ReportStatus, number>();
        for (const status of statuses) result.set(status, 0);
        for (const report of reports) {
            result.set(report.status, (result.get(report.status) ?? 0) + 1);
        }
        return result;
    }, [reports]);

    const recentReports = reports.slice(0, 5);
    const attentionReports = reports.filter((report) =>
        attentionStatuses.includes(report.status),
    );
    const workerTasksUrl = workerId
        ? `/worker/tasks?worker_id=${encodeURIComponent(workerId)}`
        : null;

    return (
        <>
            <Head title="Dashboard" />
            <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
                <div className="mx-auto max-w-6xl">
                    <header className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <a
                                href="/"
                                className="text-lg font-bold text-blue-800"
                            >
                                CampusFix
                            </a>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                                Dashboard
                            </h1>
                            <p className="mt-2 text-sm text-slate-600 sm:text-base">
                                Overview of campus facility reports and their
                                progress.
                            </p>
                        </div>
                        <a
                            href="/reports/create"
                            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                            Create report
                        </a>
                    </header>

                    <section aria-labelledby="summary-heading" className="mt-8">
                        <h2
                            id="summary-heading"
                            className="text-lg font-semibold"
                        >
                            Report overview
                        </h2>
                        {reportsLoading && (
                            <p
                                className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
                                role="status"
                            >
                                Loading report statistics…
                            </p>
                        )}
                        {!reportsLoading && reportsError && (
                            <p
                                className="mt-4 rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700"
                                role="alert"
                            >
                                {reportsError}
                            </p>
                        )}
                        {!reportsLoading && !reportsError && (
                            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                                {summaryItems.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl border border-slate-200 bg-white p-4"
                                    >
                                        <dt className="text-xs leading-5 text-slate-500">
                                            {item.label}
                                        </dt>
                                        <dd className="mt-2 text-2xl font-semibold tracking-tight">
                                            {item.status
                                                ? (counts.get(item.status) ?? 0)
                                                : reports.length}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </section>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                        <section
                            aria-labelledby="recent-heading"
                            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2
                                        id="recent-heading"
                                        className="text-lg font-semibold"
                                    >
                                        Recent reports
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Latest reports, newest first.
                                    </p>
                                </div>
                                <a
                                    href="/management/reports"
                                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                                >
                                    All reports
                                </a>
                            </div>
                            {reportsLoading && (
                                <p
                                    className="mt-5 text-sm text-slate-600"
                                    role="status"
                                >
                                    Loading recent reports…
                                </p>
                            )}
                            {!reportsLoading && reportsError && (
                                <p
                                    className="mt-5 text-sm text-red-700"
                                    role="alert"
                                >
                                    Recent reports are unavailable.
                                </p>
                            )}
                            {!reportsLoading &&
                                !reportsError &&
                                recentReports.length === 0 && (
                                    <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                                        No reports have been submitted yet.
                                    </p>
                                )}
                            {!reportsLoading &&
                                !reportsError &&
                                recentReports.length > 0 && (
                                    <ul className="mt-4 divide-y divide-slate-100">
                                        {recentReports.map((report) => (
                                            <li
                                                key={report.id}
                                                className="py-4 first:pt-1 last:pb-1"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <a
                                                            href={`/reports/${encodeURIComponent(report.id)}`}
                                                            className="font-semibold text-blue-700 hover:text-blue-900"
                                                        >
                                                            {report.reportCode}
                                                        </a>
                                                        <p className="mt-1 font-medium text-slate-900">
                                                            {report.title}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-600">
                                                            {report.category} ·{' '}
                                                            {report.location}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {report.priority}{' '}
                                                            priority ·{' '}
                                                            {formatDate(
                                                                report.createdAt,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[report.status]}`}
                                                    >
                                                        {statusLabel(
                                                            report.status,
                                                        )}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </section>

                        <section
                            aria-labelledby="attention-heading"
                            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                        >
                            <div>
                                <h2
                                    id="attention-heading"
                                    className="text-lg font-semibold"
                                >
                                    Reports requiring attention
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Reported, awaiting verification, or
                                    reopened.
                                </p>
                            </div>
                            {reportsLoading && (
                                <p
                                    className="mt-5 text-sm text-slate-600"
                                    role="status"
                                >
                                    Loading reports…
                                </p>
                            )}
                            {!reportsLoading && reportsError && (
                                <p
                                    className="mt-5 text-sm text-red-700"
                                    role="alert"
                                >
                                    Attention reports are unavailable.
                                </p>
                            )}
                            {!reportsLoading &&
                                !reportsError &&
                                attentionReports.length === 0 && (
                                    <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                                        No reports currently need attention.
                                    </p>
                                )}
                            {!reportsLoading &&
                                !reportsError &&
                                attentionReports.length > 0 && (
                                    <ul className="mt-4 divide-y divide-slate-100">
                                        {attentionReports.map((report) => (
                                            <li
                                                key={report.id}
                                                className="py-4 first:pt-1 last:pb-1"
                                            >
                                                <a
                                                    href={`/management/reports/${encodeURIComponent(report.id)}`}
                                                    className="font-semibold text-blue-700 hover:text-blue-900"
                                                >
                                                    {report.reportCode} ·{' '}
                                                    {report.title}
                                                </a>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 font-medium capitalize ${statusStyles[report.status]}`}
                                                    >
                                                        {statusLabel(
                                                            report.status,
                                                        )}
                                                    </span>
                                                    <span>
                                                        {report.location}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </section>
                    </div>

                    <section
                        aria-labelledby="quick-actions-heading"
                        className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                    >
                        <h2
                            id="quick-actions-heading"
                            className="text-lg font-semibold"
                        >
                            Quick actions
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Prototype navigation uses demo identities; no
                            sign-in is active.
                        </p>
                        <div className="mt-5 grid gap-6 md:grid-cols-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Civitas
                                </h3>
                                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                    <a
                                        href="/reports/create"
                                        className="font-medium text-blue-700 hover:text-blue-900"
                                    >
                                        Create report
                                    </a>
                                    <a
                                        href="/reports"
                                        className="font-medium text-blue-700 hover:text-blue-900"
                                    >
                                        My Reports
                                    </a>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    My Reports uses the Alya Pratama demo
                                    identity.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Management
                                </h3>
                                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                    <a
                                        href="/management/reports"
                                        className="font-medium text-blue-700 hover:text-blue-900"
                                    >
                                        Manage reports
                                    </a>
                                    <a
                                        href="/management"
                                        className="font-medium text-blue-700 hover:text-blue-900"
                                    >
                                        Management dashboard
                                    </a>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Worker
                                </h3>
                                {workersLoading && (
                                    <p
                                        className="mt-3 text-sm text-slate-600"
                                        role="status"
                                    >
                                        Loading demo workers…
                                    </p>
                                )}
                                {!workersLoading && workersError && (
                                    <p
                                        className="mt-3 text-sm text-red-700"
                                        role="alert"
                                    >
                                        {workersError}
                                    </p>
                                )}
                                {!workersLoading &&
                                    !workersError &&
                                    workers.length === 0 && (
                                        <p className="mt-3 text-sm text-slate-600">
                                            No demo workers are available.
                                        </p>
                                    )}
                                {!workersLoading &&
                                    !workersError &&
                                    workers.length > 0 && (
                                        <>
                                            <label
                                                htmlFor="demo-worker"
                                                className="mt-3 block text-sm text-slate-700"
                                            >
                                                Demo worker
                                            </label>
                                            <select
                                                id="demo-worker"
                                                value={workerId}
                                                onChange={(event) =>
                                                    setWorkerId(
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                            >
                                                <option value="">
                                                    Select a worker
                                                </option>
                                                {workers.map((worker) => (
                                                    <option
                                                        key={worker.id}
                                                        value={worker.id}
                                                    >
                                                        {worker.name}
                                                        {worker.department
                                                            ? ` · ${worker.department}`
                                                            : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {workerTasksUrl ? (
                                                <a
                                                    href={workerTasksUrl}
                                                    className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                                >
                                                    My tasks
                                                </a>
                                            ) : (
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Select a demo worker to open
                                                    their assigned tasks.
                                                </p>
                                            )}
                                        </>
                                    )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
