import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Props = {
    reportId: string;
};

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

type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: ReportStatus;
    description: string;
    assignedWorkerId?: string | null;
};

type WorkLog = {
    id: string;
    status: string;
    note: string;
    createdAt: string;
};

type Worker = {
    id: string;
    name: string;
    role: 'worker';
    department?: string | null;
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
        reportStatuses.includes(value.status as ReportStatus) &&
        typeof value.description === 'string' &&
        (typeof value.assignedWorkerId === 'string' ||
            value.assignedWorkerId === null ||
            value.assignedWorkerId === undefined)
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

function messageFrom(payload: unknown, fallback: string): string {
    return isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : fallback;
}

export default function Show({ reportId }: Props) {
    const [report, setReport] = useState<Report | null>(null);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workersLoading, setWorkersLoading] = useState(true);
    const [workersError, setWorkersError] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignmentMessage, setAssignmentMessage] = useState('');
    const [assignmentError, setAssignmentError] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusError, setStatusError] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const workersById = useMemo(
        () => new Map(workers.map((worker) => [worker.id, worker])),
        [workers],
    );

    useEffect(() => {
        if (report) setSelectedStatus(report.status);
    }, [report?.status]);

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
                setSelectedWorkerId(reportPayload.assignedWorkerId ?? '');
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

    useEffect(() => {
        const controller = new AbortController();

        async function loadWorkers() {
            setWorkersLoading(true);
            setWorkersError('');
            try {
                const response = await fetch('/api/workers', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const payload = await readJson(response);
                if (
                    !response.ok ||
                    !Array.isArray(payload) ||
                    !payload.every(isWorker)
                ) {
                    throw new Error(
                        messageFrom(
                            payload,
                            'Could not load available workers.',
                        ),
                    );
                }
                setWorkers(payload);
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setWorkersError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Could not load available workers.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setWorkersLoading(false);
            }
        }

        void loadWorkers();
        return () => controller.abort();
    }, []);

    async function assignWorker(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!report || !selectedWorkerId || assigning) return;

        setAssigning(true);
        setAssignmentError('');
        setAssignmentMessage('');

        try {
            const response = await fetch(
                `/api/reports/${encodeURIComponent(reportId)}/assign`,
                {
                    method: 'PATCH',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ workerId: selectedWorkerId }),
                },
            );
            const payload = await readJson(response);
            if (!response.ok || !isReport(payload)) {
                throw new Error(
                    messageFrom(payload, 'Could not assign the worker.'),
                );
            }

            setReport(payload);
            setSelectedWorkerId(payload.assignedWorkerId ?? selectedWorkerId);
            setAssignmentMessage(
                `Assigned to ${workersById.get(selectedWorkerId)?.name ?? 'worker'}.`,
            );

            const logsResponse = await fetch(
                `/api/reports/${encodeURIComponent(reportId)}/work-logs`,
                { headers: { Accept: 'application/json' } },
            );
            const logsPayload = await readJson(logsResponse);
            if (
                !logsResponse.ok ||
                !Array.isArray(logsPayload) ||
                !logsPayload.every(isWorkLog)
            ) {
                setAssignmentError(
                    messageFrom(
                        logsPayload,
                        'Worker assigned, but work logs could not be refreshed.',
                    ),
                );
            } else {
                setWorkLogs(logsPayload);
            }
        } catch (assignError) {
            setAssignmentError(
                assignError instanceof Error
                    ? assignError.message
                    : 'Could not assign the worker.',
            );
        } finally {
            setAssigning(false);
        }
    }

    async function updateStatus(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!report || !selectedStatus || updatingStatus) return;

        setUpdatingStatus(true);
        setStatusError('');
        setStatusMessage('');

        try {
            const response = await fetch(
                `/api/reports/${encodeURIComponent(reportId)}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: selectedStatus }),
                },
            );
            const payload = await readJson(response);
            if (!response.ok || !isReport(payload)) {
                throw new Error(
                    messageFrom(payload, 'Could not update report status.'),
                );
            }

            setReport(payload);
            setStatusMessage('Report status updated.');

            try {
                const logsResponse = await fetch(
                    `/api/reports/${encodeURIComponent(reportId)}/work-logs`,
                    { headers: { Accept: 'application/json' } },
                );
                const logsPayload = await readJson(logsResponse);
                if (
                    !logsResponse.ok ||
                    !Array.isArray(logsPayload) ||
                    !logsPayload.every(isWorkLog)
                ) {
                    throw new Error(
                        messageFrom(
                            logsPayload,
                            'Could not refresh work logs.',
                        ),
                    );
                }
                setWorkLogs(logsPayload);
            } catch (refreshError) {
                setStatusError(
                    refreshError instanceof Error
                        ? `Status updated, but ${refreshError.message.toLowerCase()}`
                        : 'Status updated, but work logs could not be refreshed.',
                );
            }
        } catch (updateError) {
            setStatusError(
                updateError instanceof Error
                    ? updateError.message
                    : 'Could not update report status.',
            );
        } finally {
            setUpdatingStatus(false);
        }
    }

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
                                    Update Status
                                </h2>
                                <form
                                    className="mt-4 flex flex-col gap-3 sm:flex-row"
                                    onSubmit={updateStatus}
                                >
                                    <label
                                        className="sr-only"
                                        htmlFor="reportStatus"
                                    >
                                        Select report status
                                    </label>
                                    <select
                                        id="reportStatus"
                                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                        value={selectedStatus}
                                        onChange={(event) =>
                                            setSelectedStatus(
                                                event.target
                                                    .value as ReportStatus,
                                            )
                                        }
                                        required
                                    >
                                        {reportStatuses.map((status) => (
                                            <option key={status} value={status}>
                                                {status.replaceAll('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={
                                            updatingStatus || !selectedStatus
                                        }
                                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                    >
                                        {updatingStatus
                                            ? 'Updating…'
                                            : 'Update Status'}
                                    </button>
                                </form>
                                {statusMessage && (
                                    <p
                                        className="mt-3 text-sm text-emerald-700"
                                        role="status"
                                    >
                                        {statusMessage}
                                    </p>
                                )}
                                {statusError && (
                                    <p
                                        className="mt-3 text-sm text-red-700"
                                        role="alert"
                                    >
                                        {statusError}
                                    </p>
                                )}
                            </section>

                            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Assign Worker
                                </h2>
                                {report.assignedWorkerId && (
                                    <p className="mt-2 text-sm text-slate-600">
                                        Currently assigned:{' '}
                                        {workersById.get(
                                            report.assignedWorkerId,
                                        )?.name ?? 'Worker'}
                                    </p>
                                )}

                                {workersLoading ? (
                                    <p
                                        className="mt-4 text-sm text-slate-500"
                                        role="status"
                                    >
                                        Loading available workers…
                                    </p>
                                ) : workersError ? (
                                    <p
                                        className="mt-4 text-sm text-red-700"
                                        role="alert"
                                    >
                                        {workersError}
                                    </p>
                                ) : workers.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-500">
                                        No workers are available.
                                    </p>
                                ) : (
                                    <form
                                        className="mt-4 flex flex-col gap-3 sm:flex-row"
                                        onSubmit={assignWorker}
                                    >
                                        <label
                                            className="sr-only"
                                            htmlFor="workerId"
                                        >
                                            Select worker
                                        </label>
                                        <select
                                            id="workerId"
                                            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                            value={selectedWorkerId}
                                            onChange={(event) =>
                                                setSelectedWorkerId(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="" disabled>
                                                Select a worker
                                            </option>
                                            {workers.map((worker) => (
                                                <option
                                                    key={worker.id}
                                                    value={worker.id}
                                                >
                                                    {worker.name}
                                                    {worker.department
                                                        ? ` — ${worker.department}`
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={
                                                assigning ||
                                                workers.length === 0 ||
                                                !selectedWorkerId
                                            }
                                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {assigning
                                                ? 'Assigning…'
                                                : 'Assign Worker'}
                                        </button>
                                    </form>
                                )}
                                {assignmentMessage && (
                                    <p
                                        className="mt-3 text-sm text-emerald-700"
                                        role="status"
                                    >
                                        {assignmentMessage}
                                    </p>
                                )}
                                {assignmentError && (
                                    <p
                                        className="mt-3 text-sm text-red-700"
                                        role="alert"
                                    >
                                        {assignmentError}
                                    </p>
                                )}
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
