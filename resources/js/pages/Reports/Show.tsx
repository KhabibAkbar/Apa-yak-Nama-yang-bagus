import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Props = {
    reportId: string;
};

type ReportStatus =
    | 'reported'
    | 'under_review'
    | 'assigned'
    | 'in_progress'
    | 'waiting_verification'
    | 'resolved'
    | 'reopened';

type ReportPriority = 'low' | 'medium' | 'high';

const reportStatuses: ReportStatus[] = [
    'reported',
    'under_review',
    'assigned',
    'in_progress',
    'waiting_verification',
    'resolved',
    'reopened',
];

const reportPriorities: ReportPriority[] = ['low', 'medium', 'high'];

type Report = {
    id: string;
    reportCode: string;
    reporterId: string;
    title: string;
    description: string;
    category: string;
    location: string;
    priority: ReportPriority;
    status: ReportStatus;
    createdAt: string;
    image?: string | null;
    assignedWorkerId?: string | null;
};

type DemoUser = {
    id: string;
    name: string;
    role: string;
};

type WorkLog = {
    id: string;
    status: string;
    note: string;
    createdAt: string;
    workerId?: string | null;
    beforeImage?: string | null;
    afterImage?: string | null;
};

type LoadedReport = {
    report: Report;
    reporter: DemoUser | null;
    assignedWorker: DemoUser | null;
    users: DemoUser[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isReportStatus(value: unknown): value is ReportStatus {
    return (
        typeof value === 'string' &&
        reportStatuses.includes(value as ReportStatus)
    );
}

function isReportPriority(value: unknown): value is ReportPriority {
    return (
        typeof value === 'string' &&
        reportPriorities.includes(value as ReportPriority)
    );
}

function isReport(value: unknown): value is Report {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.reportCode === 'string' &&
        typeof value.reporterId === 'string' &&
        typeof value.title === 'string' &&
        typeof value.description === 'string' &&
        typeof value.category === 'string' &&
        typeof value.location === 'string' &&
        isReportPriority(value.priority) &&
        isReportStatus(value.status) &&
        typeof value.createdAt === 'string' &&
        (typeof value.image === 'string' ||
            value.image === null ||
            value.image === undefined) &&
        (typeof value.assignedWorkerId === 'string' ||
            value.assignedWorkerId === null ||
            value.assignedWorkerId === undefined)
    );
}

function isDemoUser(value: unknown): value is DemoUser {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.role === 'string'
    );
}

function isWorkLog(value: unknown): value is WorkLog {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.status === 'string' &&
        typeof value.note === 'string' &&
        typeof value.createdAt === 'string' &&
        (typeof value.workerId === 'string' ||
            value.workerId === null ||
            value.workerId === undefined) &&
        (typeof value.beforeImage === 'string' ||
            value.beforeImage === null ||
            value.beforeImage === undefined) &&
        (typeof value.afterImage === 'string' ||
            value.afterImage === null ||
            value.afterImage === undefined)
    );
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function proofSource(reference: string): string | null {
    if (/^https?:\/\//i.test(reference)) return reference;
    if (reference.startsWith('report-proofs/')) return `/storage/${reference}`;
    return null;
}

function reportPhotoSource(reference: string): string {
    if (/^https?:\/\//i.test(reference) || reference.startsWith('/storage/')) {
        return reference;
    }

    return `/storage/${reference
        .replace(/^\/+/, '')
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;
}

function formatTimestamp(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Time unavailable'
        : date.toLocaleString();
}

const statusClasses: Record<ReportStatus, string> = {
    reported: 'bg-slate-100 text-slate-700',
    under_review: 'bg-amber-100 text-amber-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    waiting_verification: 'bg-violet-100 text-violet-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    reopened: 'bg-rose-100 text-rose-800',
};

const statusLabels: Record<ReportStatus, string> = {
    reported: 'Reported',
    under_review: 'Under review',
    assigned: 'Assigned',
    in_progress: 'In progress',
    waiting_verification: 'Waiting verification',
    resolved: 'Resolved',
    reopened: 'Reopened',
};

const priorityClasses = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-rose-100 text-rose-800',
};

export default function ShowReport({ reportId }: Props) {
    const [loaded, setLoaded] = useState<LoadedReport | null>(null);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [workLogsLoading, setWorkLogsLoading] = useState(true);
    const [workLogsError, setWorkLogsError] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [photoLoadError, setPhotoLoadError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function loadReport() {
            setLoading(true);
            setWorkLogsLoading(true);
            setError('');
            setWorkLogsError('');

            try {
                const [reportResponse, usersResponse] = await Promise.all([
                    fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    }),
                    fetch('/api/users', {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    }),
                ]);
                const [reportPayload, usersPayload] = await Promise.all([
                    readJson(reportResponse),
                    readJson(usersResponse),
                ]);

                if (!reportResponse.ok || !isReport(reportPayload)) {
                    throw new Error(
                        reportResponse.status === 404
                            ? 'This report could not be found.'
                            : 'Could not load this report.',
                    );
                }

                if (!usersResponse.ok || !Array.isArray(usersPayload)) {
                    throw new Error('Could not load the report reporter.');
                }

                const users: unknown[] = usersPayload;
                const demoUsers = users.filter(isDemoUser);
                const reporter = users.find(
                    (user): user is DemoUser =>
                        isDemoUser(user) &&
                        user.id === reportPayload.reporterId,
                );
                const assignedWorker = users.find(
                    (user): user is DemoUser =>
                        isDemoUser(user) &&
                        user.id === reportPayload.assignedWorkerId,
                );

                setLoaded({
                    report: reportPayload,
                    reporter: reporter ?? null,
                    assignedWorker: assignedWorker ?? null,
                    users: demoUsers,
                });
                setLoading(false);

                try {
                    const workLogsResponse = await fetch(
                        `/api/reports/${encodeURIComponent(reportId)}/work-logs`,
                        {
                            headers: { Accept: 'application/json' },
                            signal: controller.signal,
                        },
                    );
                    const workLogsPayload: unknown =
                        await readJson(workLogsResponse);
                    if (
                        workLogsResponse.ok &&
                        Array.isArray(workLogsPayload) &&
                        workLogsPayload.every(isWorkLog)
                    ) {
                        setWorkLogs(workLogsPayload);
                    } else {
                        setWorkLogsError(
                            'Could not load this report’s work history.',
                        );
                    }
                } catch {
                    if (!controller.signal.aborted) {
                        setWorkLogsError(
                            'Could not load this report’s work history.',
                        );
                    }
                }
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'A network error prevented this report from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setWorkLogsLoading(false);
                }
            }
        }

        void loadReport();

        return () => controller.abort();
    }, [reportId, reloadKey]);

    const report = loaded?.report;
    useEffect(() => {
        setPhotoLoadError(false);
    }, [report?.image]);

    const createdDate = report ? new Date(report.createdAt) : null;
    const createdLabel =
        createdDate && !Number.isNaN(createdDate.getTime())
            ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              }).format(createdDate)
            : 'Date unavailable';

    return (
        <>
            <Head title={report ? report.reportCode : 'Report details'} />
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
                        <a
                            href="/"
                            className="text-lg font-bold tracking-tight text-blue-800"
                        >
                            CampusFix
                        </a>
                        <a
                            href="/reports"
                            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                        >
                            My reports
                        </a>
                    </div>
                </header>

                <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
                    <a
                        href="/reports"
                        className="text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                        ← Back to my reports
                    </a>

                    {loading && (
                        <section
                            className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm"
                            role="status"
                        >
                            Loading report details…
                        </section>
                    )}

                    {!loading && error && (
                        <section
                            className="mt-5 rounded-2xl border border-red-200 bg-white p-8 shadow-sm"
                            role="alert"
                        >
                            <h1 className="text-xl font-semibold">
                                Report unavailable
                            </h1>
                            <p className="mt-2 text-sm text-red-700">{error}</p>
                            <button
                                type="button"
                                onClick={() =>
                                    setReloadKey((current) => current + 1)
                                }
                                className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                Try again
                            </button>
                        </section>
                    )}

                    {!loading && !error && report && (
                        <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-6 py-6 sm:px-9">
                                <p className="text-sm font-semibold text-blue-700">
                                    REPORT {report.reportCode}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                        {report.title}
                                    </h1>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[report.status]}`}
                                    >
                                        {statusLabels[report.status]}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm text-slate-600">
                                    Submitted by{' '}
                                    {loaded.reporter?.name ??
                                        'Civitas reporter'}{' '}
                                    · {createdLabel}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                    Assigned worker:{' '}
                                    {loaded.assignedWorker?.name ??
                                        (report.assignedWorkerId
                                            ? 'Worker details unavailable'
                                            : 'Not assigned')}
                                </p>
                            </div>

                            <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-9">
                                <div>
                                    <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                        Description
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-800">
                                        {report.description}
                                    </p>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Category
                                        </h2>
                                        <p className="mt-2 text-sm font-medium text-slate-800">
                                            {report.category}
                                        </p>
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Location
                                        </h2>
                                        <p className="mt-2 text-sm font-medium text-slate-800">
                                            {report.location}
                                        </p>
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Priority
                                        </h2>
                                        <span
                                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityClasses[report.priority]}`}
                                        >
                                            {report.priority}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 px-6 py-6 sm:px-9">
                                <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Report photo
                                </h2>
                                {report.image && !photoLoadError ? (
                                    <img
                                        src={reportPhotoSource(report.image)}
                                        alt={`Photo for ${report.title}`}
                                        className="mt-3 max-h-80 rounded-lg border border-slate-200 object-contain"
                                        onError={() => setPhotoLoadError(true)}
                                    />
                                ) : (
                                    <p className="mt-2 text-sm text-slate-600">
                                        {report.image
                                            ? 'Photo is unavailable.'
                                            : 'No photo provided.'}
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-9">
                                Keep this report code for reference:{' '}
                                {report.reportCode}
                            </div>
                        </article>
                    )}

                    {!loading && !error && report && (
                        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                            <h2 className="text-lg font-semibold">
                                Progress history
                            </h2>
                            {workLogsLoading && (
                                <p
                                    className="mt-4 text-sm text-slate-600"
                                    role="status"
                                >
                                    Loading work history…
                                </p>
                            )}
                            {!workLogsLoading && workLogsError && (
                                <p
                                    className="mt-4 text-sm text-red-700"
                                    role="alert"
                                >
                                    {workLogsError}
                                </p>
                            )}
                            {!workLogsLoading &&
                                !workLogsError &&
                                workLogs.length === 0 && (
                                    <p className="mt-4 text-sm text-slate-500">
                                        No work history has been recorded yet.
                                    </p>
                                )}
                            {!workLogsLoading &&
                                !workLogsError &&
                                workLogs.length > 0 && (
                                    <ol className="mt-4 divide-y divide-slate-100">
                                        {workLogs.map((log) => {
                                            const worker = loaded.users.find(
                                                (user) =>
                                                    user.id === log.workerId,
                                            );
                                            return (
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
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        Worker:{' '}
                                                        {worker?.name ??
                                                            log.workerId ??
                                                            'Not available'}
                                                    </p>
                                                    <time
                                                        className="mt-1 block text-xs text-slate-500"
                                                        dateTime={log.createdAt}
                                                    >
                                                        {formatTimestamp(
                                                            log.createdAt,
                                                        )}
                                                    </time>
                                                    {(
                                                        [
                                                            [
                                                                'Before work',
                                                                log.beforeImage,
                                                            ],
                                                            [
                                                                'Work proof',
                                                                log.afterImage,
                                                            ],
                                                        ] as const
                                                    ).map(
                                                        ([
                                                            label,
                                                            reference,
                                                        ]) => {
                                                            if (!reference)
                                                                return null;
                                                            const source =
                                                                proofSource(
                                                                    reference,
                                                                );
                                                            return source ? (
                                                                <img
                                                                    key={label}
                                                                    src={source}
                                                                    alt={label}
                                                                    className="mt-3 max-h-64 rounded-lg border border-slate-200 object-contain"
                                                                />
                                                            ) : (
                                                                <p
                                                                    key={label}
                                                                    className="mt-2 text-xs text-slate-500"
                                                                >
                                                                    {label}{' '}
                                                                    reference:{' '}
                                                                    {reference}
                                                                </p>
                                                            );
                                                        },
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}
