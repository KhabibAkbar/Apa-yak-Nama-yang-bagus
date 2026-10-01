import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const reportStatuses = [
    'reported',
    'under_review',
    'assigned',
    'in_progress',
    'waiting_verification',
    'resolved',
    'reopened',
] as const;

type ReportStatus = (typeof reportStatuses)[number];

type Worker = {
    id: string;
    name: string;
    role: 'worker';
    department?: string | null;
};

type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: ReportStatus;
    reporterId?: string | null;
    assignedWorkerId: string;
    createdAt?: string;
};

type DemoUser = {
    id: string;
    name: string;
    role: string;
};

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

function isReportStatus(value: unknown): value is ReportStatus {
    return (
        typeof value === 'string' &&
        reportStatuses.includes(value as ReportStatus)
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
        typeof value.assignedWorkerId === 'string' &&
        (typeof value.reporterId === 'string' ||
            value.reporterId === null ||
            value.reporterId === undefined) &&
        (typeof value.createdAt === 'string' || value.createdAt === undefined)
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

export default function WorkerDashboard() {
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [queryRead, setQueryRead] = useState(false);
    const [worker, setWorker] = useState<Worker | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<DemoUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workerNotFound, setWorkerNotFound] = useState(false);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search)
            .get('worker_id')
            ?.trim();
        setWorkerId(id || null);
        setQueryRead(true);
    }, []);

    useEffect(() => {
        if (!queryRead) return;
        if (!workerId) {
            setLoading(false);
            return;
        }

        const selectedWorkerId = workerId;
        const controller = new AbortController();

        async function loadWorkerDashboard() {
            setLoading(true);
            setError('');
            setWorkerNotFound(false);

            try {
                const workersResponse = await fetch('/api/workers', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const workersPayload: unknown = await readJson(workersResponse);

                if (
                    !workersResponse.ok ||
                    !Array.isArray(workersPayload) ||
                    !workersPayload.every(isWorker)
                ) {
                    throw new Error(
                        responseMessage(
                            workersPayload,
                            'Unable to load worker tasks.',
                        ),
                    );
                }

                const selectedWorker = workersPayload.find(
                    (item) => item.id === selectedWorkerId,
                );
                if (!selectedWorker) {
                    setWorkerNotFound(true);
                    return;
                }
                setWorker(selectedWorker);

                const params = new URLSearchParams({
                    assigned_worker_id: selectedWorkerId,
                });
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
                    !reportsPayload.every(isReport) ||
                    !reportsPayload.every(
                        (report) =>
                            report.assignedWorkerId === selectedWorkerId,
                    )
                ) {
                    throw new Error(
                        responseMessage(
                            reportsPayload,
                            'Unable to load worker tasks.',
                        ),
                    );
                }
                setReports(reportsPayload);

                try {
                    const usersResponse = await fetch('/api/users', {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    });
                    const usersPayload: unknown = await readJson(usersResponse);
                    if (
                        usersResponse.ok &&
                        Array.isArray(usersPayload) &&
                        usersPayload.every(isDemoUser)
                    ) {
                        setUsers(usersPayload);
                    }
                } catch {
                    // Task loading remains useful when optional reporter names are unavailable.
                }
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Unable to load worker tasks.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadWorkerDashboard();
        return () => controller.abort();
    }, [queryRead, workerId]);

    const counts = useMemo(() => {
        return {
            assigned: reports.filter((report) => report.status === 'assigned')
                .length,
            inProgress: reports.filter(
                (report) => report.status === 'in_progress',
            ).length,
            waitingVerification: reports.filter(
                (report) => report.status === 'waiting_verification',
            ).length,
            resolved: reports.filter((report) => report.status === 'resolved')
                .length,
        };
    }, [reports]);

    const usersById = useMemo(
        () => new Map(users.map((user) => [user.id, user])),
        [users],
    );
    const workerTasksUrl = workerId
        ? `/worker/tasks?worker_id=${encodeURIComponent(workerId)}`
        : null;

    return (
        <>
            <Head title="Worker dashboard" />
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
                                Worker Dashboard
                            </h1>
                            {worker && (
                                <p className="mt-2 text-slate-600">
                                    {worker.name}
                                    {worker.department
                                        ? ` · ${worker.department}`
                                        : ''}
                                </p>
                            )}
                            {worker && (
                                <p className="mt-1 text-xs text-slate-500">
                                    Demo worker account · {worker.id}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm font-medium">
                            <a
                                href="/dashboard"
                                className="text-blue-700 hover:text-blue-900"
                            >
                                Back to dashboard
                            </a>
                            {workerTasksUrl && (
                                <a
                                    href={workerTasksUrl}
                                    className="text-blue-700 hover:text-blue-900"
                                >
                                    Worker Tasks
                                </a>
                            )}
                        </div>
                    </header>

                    {!queryRead && (
                        <p
                            className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
                            role="status"
                        >
                            Loading worker dashboard...
                        </p>
                    )}

                    {queryRead && !workerId && (
                        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
                            <h2 className="font-semibold text-amber-950">
                                Worker ID is required
                            </h2>
                            <p className="mt-2 text-sm text-amber-900">
                                Open this page with ?worker_id=YOUR_WORKER_ID.
                            </p>
                            <a
                                href="/dashboard"
                                className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900"
                            >
                                Back to dashboard
                            </a>
                        </section>
                    )}

                    {queryRead && workerId && loading && (
                        <p
                            className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
                            role="status"
                        >
                            Loading worker dashboard...
                        </p>
                    )}

                    {queryRead && workerId && !loading && workerNotFound && (
                        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
                            <h2 className="font-semibold text-amber-950">
                                Worker not found
                            </h2>
                            <p className="mt-2 text-sm text-amber-900">
                                This ID does not match an available demo worker.
                            </p>
                            <a
                                href="/dashboard"
                                className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900"
                            >
                                Back to dashboard
                            </a>
                        </section>
                    )}

                    {queryRead && workerId && !loading && error && (
                        <section
                            className="mt-8 rounded-xl border border-red-200 bg-white p-5"
                            role="alert"
                        >
                            <h2 className="font-semibold text-red-800">
                                Unable to load worker tasks.
                            </h2>
                            <p className="mt-2 text-sm text-red-700">{error}</p>
                            <a
                                href="/dashboard"
                                className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900"
                            >
                                Back to dashboard
                            </a>
                        </section>
                    )}

                    {queryRead &&
                        workerId &&
                        !loading &&
                        !error &&
                        !workerNotFound &&
                        worker && (
                            <>
                                <section
                                    aria-label="Task summary"
                                    className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
                                >
                                    {[
                                        {
                                            label: 'Assigned',
                                            count: counts.assigned,
                                        },
                                        {
                                            label: 'In Progress',
                                            count: counts.inProgress,
                                        },
                                        {
                                            label: 'Waiting Verification',
                                            count: counts.waitingVerification,
                                        },
                                        {
                                            label: 'Resolved',
                                            count: counts.resolved,
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-xl border border-slate-200 bg-white p-4"
                                        >
                                            <p className="text-sm text-slate-600">
                                                {item.label}
                                            </p>
                                            <p className="mt-2 text-2xl font-semibold">
                                                {item.count}
                                            </p>
                                        </div>
                                    ))}
                                </section>

                                <section
                                    aria-labelledby="assigned-tasks"
                                    className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2
                                                id="assigned-tasks"
                                                className="text-lg font-semibold"
                                            >
                                                Assigned Tasks
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Tasks assigned to {worker.name}.
                                            </p>
                                        </div>
                                        {workerTasksUrl && (
                                            <a
                                                href={workerTasksUrl}
                                                className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                                            >
                                                Open task list
                                            </a>
                                        )}
                                    </div>

                                    {reports.length === 0 && (
                                        <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                                            No assigned tasks yet.
                                        </p>
                                    )}

                                    {reports.length > 0 && (
                                        <ul className="mt-4 divide-y divide-slate-100">
                                            {reports.map((report) => {
                                                const reporter =
                                                    report.reporterId
                                                        ? usersById.get(
                                                              report.reporterId,
                                                          )
                                                        : undefined;
                                                return (
                                                    <li
                                                        key={report.id}
                                                        className="py-4 first:pt-1 last:pb-1"
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <a
                                                                    href={`/worker/tasks/${encodeURIComponent(report.id)}?worker_id=${encodeURIComponent(workerId)}`}
                                                                    className="font-semibold text-blue-700 hover:text-blue-900"
                                                                >
                                                                    {
                                                                        report.title
                                                                    }
                                                                </a>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {
                                                                        report.reportCode
                                                                    }{' '}
                                                                    · ID{' '}
                                                                    {report.id}
                                                                </p>
                                                                <p className="mt-2 text-sm text-slate-700">
                                                                    {
                                                                        report.category
                                                                    }{' '}
                                                                    ·{' '}
                                                                    {
                                                                        report.location
                                                                    }
                                                                </p>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {
                                                                        report.priority
                                                                    }{' '}
                                                                    priority ·
                                                                    Reporter:{' '}
                                                                    {reporter?.name ??
                                                                        report.reporterId ??
                                                                        'Unavailable'}{' '}
                                                                    ·{' '}
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
                                                );
                                            })}
                                        </ul>
                                    )}
                                </section>
                            </>
                        )}
                </div>
            </main>
        </>
    );
}
