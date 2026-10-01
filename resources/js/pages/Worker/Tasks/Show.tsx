import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

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
    description?: string;
    reporterId?: string | null;
    assignedWorkerId?: string | null;
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

type WorkerStatusAction = {
    label: string;
    nextStatus: string;
};

function getWorkerStatusAction(status: string): WorkerStatusAction | null {
    switch (status) {
        case 'assigned':
            return { label: 'Start Task', nextStatus: 'in_progress' };
        case 'in_progress':
            return {
                label: 'Mark Waiting Verification',
                nextStatus: 'waiting_verification',
            };
        case 'reopened':
            return { label: 'Resume Task', nextStatus: 'in_progress' };
        default:
            return null;
    }
}

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
        (typeof value.description === 'string' ||
            value.description === undefined ||
            value.description === null) &&
        (typeof value.reporterId === 'string' ||
            value.reporterId === undefined ||
            value.reporterId === null) &&
        (typeof value.assignedWorkerId === 'string' ||
            value.assignedWorkerId === undefined ||
            value.assignedWorkerId === null)
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
            value.workerId === undefined ||
            value.workerId === null) &&
        (typeof value.beforeImage === 'string' ||
            value.beforeImage === undefined ||
            value.beforeImage === null) &&
        (typeof value.afterImage === 'string' ||
            value.afterImage === undefined ||
            value.afterImage === null)
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

function formatTimestamp(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Time unavailable'
        : date.toLocaleString();
}

function proofSource(reference: string): string | null {
    if (/^https?:\/\//i.test(reference)) return reference;
    if (reference.startsWith('report-proofs/')) {
        return `/storage/${reference}`;
    }

    return null;
}

async function fetchWorkLogs(
    reportId: string,
    signal?: AbortSignal,
): Promise<WorkLog[]> {
    const response = await fetch(
        `/api/reports/${encodeURIComponent(reportId)}/work-logs`,
        {
            headers: { Accept: 'application/json' },
            signal,
        },
    );
    const payload = await readJson(response);

    if (!response.ok || !Array.isArray(payload) || !payload.every(isWorkLog)) {
        throw new Error(
            messageFrom(payload, 'Could not load this task’s work history.'),
        );
    }

    return payload;
}

export default function WorkerTaskShow({ reportId }: Props) {
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [queryRead, setQueryRead] = useState(false);
    const [report, setReport] = useState<Report | null>(null);
    const [reportLoading, setReportLoading] = useState(true);
    const [reportError, setReportError] = useState('');
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [workLogsLoading, setWorkLogsLoading] = useState(true);
    const [workLogsError, setWorkLogsError] = useState('');
    const [statusUpdateState, setStatusUpdateState] = useState<
        'idle' | 'submitting' | 'success' | 'error'
    >('idle');
    const [statusUpdateMessage, setStatusUpdateMessage] = useState('');
    const [workNote, setWorkNote] = useState('');
    const [workLogState, setWorkLogState] = useState<
        'idle' | 'submitting' | 'success' | 'error'
    >('idle');
    const [workLogMessage, setWorkLogMessage] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofState, setProofState] = useState<
        'idle' | 'submitting' | 'success' | 'error'
    >('idle');
    const [proofMessage, setProofMessage] = useState('');
    const proofInputRef = useRef<HTMLInputElement>(null);

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
            setReportLoading(false);
            setWorkLogsLoading(false);
            return;
        }

        const selectedReportId = reportId;
        const controller = new AbortController();

        async function loadReport() {
            setReportLoading(true);
            setReportError('');

            try {
                const response = await fetch(
                    `/api/reports/${encodeURIComponent(selectedReportId)}`,
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );
                const payload = await readJson(response);

                if (!response.ok || !isReport(payload)) {
                    throw new Error(
                        messageFrom(
                            payload,
                            response.status === 404
                                ? 'This task report was not found.'
                                : 'Could not load this task report.',
                        ),
                    );
                }

                setReport(payload);
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setReportError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'A network error prevented the task from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setReportLoading(false);
            }
        }

        async function loadWorkLogs() {
            setWorkLogsLoading(true);
            setWorkLogsError('');

            try {
                setWorkLogs(
                    await fetchWorkLogs(selectedReportId, controller.signal),
                );
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setWorkLogsError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'A network error prevented work history from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setWorkLogsLoading(false);
            }
        }

        void loadReport();
        void loadWorkLogs();

        return () => controller.abort();
    }, [queryRead, reportId, workerId]);

    async function updateWorkerStatus(nextStatus: string) {
        if (!workerId || !report || statusUpdateState === 'submitting') return;

        setStatusUpdateState('submitting');
        setStatusUpdateMessage('');

        try {
            const response = await fetch(
                `/api/reports/${encodeURIComponent(reportId)}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: nextStatus,
                        worker_id: workerId,
                    }),
                },
            );
            const payload = await readJson(response);

            if (!response.ok || !isReport(payload)) {
                throw new Error(
                    messageFrom(payload, 'Could not update this task status.'),
                );
            }

            setReport(payload);
            setStatusUpdateState('success');
            setStatusUpdateMessage('Task status updated successfully.');
        } catch (updateError) {
            setStatusUpdateState('error');
            setStatusUpdateMessage(
                updateError instanceof Error
                    ? updateError.message
                    : 'A network error prevented the status update.',
            );
        }
    }

    async function refreshWorkLogs() {
        if (!workerId) return;

        setWorkLogsLoading(true);
        setWorkLogsError('');

        try {
            setWorkLogs(await fetchWorkLogs(reportId));
        } catch (loadError) {
            setWorkLogsError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not refresh this task’s work history.',
            );
        } finally {
            setWorkLogsLoading(false);
        }
    }

    async function submitWorkLog(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (
            !workerId ||
            !report ||
            report.assignedWorkerId !== workerId ||
            !workNote.trim() ||
            workLogState === 'submitting'
        ) {
            return;
        }

        setWorkLogState('submitting');
        setWorkLogMessage('');

        try {
            const response = await fetch(
                `/api/reports/${encodeURIComponent(reportId)}/work-logs`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        worker_id: workerId,
                        note: workNote.trim(),
                    }),
                },
            );
            const payload = await readJson(response);

            if (!response.ok || !isWorkLog(payload)) {
                throw new Error(
                    messageFrom(payload, 'Could not add this work note.'),
                );
            }

            setWorkNote('');
            setWorkLogState('success');
            setWorkLogMessage('Work note added successfully.');
            await refreshWorkLogs();
        } catch (submitError) {
            setWorkLogState('error');
            setWorkLogMessage(
                submitError instanceof Error
                    ? submitError.message
                    : 'A network error prevented the work note from being saved.',
            );
        }
    }

    async function uploadProof(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (
            !workerId ||
            !report ||
            report.assignedWorkerId !== workerId ||
            !proofFile ||
            proofState === 'submitting'
        ) {
            return;
        }

        setProofState('submitting');
        setProofMessage('');

        try {
            const formData = new FormData();
            formData.append('worker_id', workerId);
            formData.append('proof', proofFile);

            const response = await fetch(
                `/api/reports/${encodeURIComponent(reportId)}/proof`,
                {
                    method: 'POST',
                    headers: { Accept: 'application/json' },
                    body: formData,
                },
            );
            const payload = await readJson(response);

            if (!response.ok || !isWorkLog(payload)) {
                throw new Error(
                    messageFrom(payload, 'Could not upload the proof image.'),
                );
            }

            setProofFile(null);
            if (proofInputRef.current) proofInputRef.current.value = '';
            setProofState('success');
            setProofMessage('Completion proof uploaded successfully.');
            await refreshWorkLogs();
        } catch (uploadError) {
            setProofState('error');
            setProofMessage(
                uploadError instanceof Error
                    ? uploadError.message
                    : 'A network error prevented the proof upload.',
            );
        }
    }

    function selectProof(file: File | null) {
        setProofFile(file);
        setProofMessage('');

        if (!file) {
            setProofState('idle');
            return;
        }

        const supportedType = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ].includes(file.type);

        if (!supportedType) {
            setProofState('error');
            setProofMessage('Choose a JPG, PNG, or WebP image.');
        } else if (file.size > 5 * 1024 * 1024) {
            setProofState('error');
            setProofMessage('The image must be 5 MB or smaller.');
        } else {
            setProofState('idle');
        }
    }

    const backUrl = workerId
        ? `/worker/tasks?worker_id=${encodeURIComponent(workerId)}`
        : '/worker/tasks';
    const workerAction = report ? getWorkerStatusAction(report.status) : null;
    const workerIsAssigned = Boolean(
        workerId && report?.assignedWorkerId === workerId,
    );

    return (
        <>
            <Head title={report ? report.reportCode : 'Task details'} />
            <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900">
                <div className="mx-auto max-w-4xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-blue-700">
                                CAMPUSFIX WORKER
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold">
                                Task details
                            </h1>
                        </div>
                        <a
                            href={backUrl}
                            className="text-sm font-medium text-blue-700 hover:underline"
                        >
                            Back to tasks
                        </a>
                    </div>

                    {!queryRead && (
                        <p
                            className="mt-5 rounded-lg bg-white p-5 text-sm text-slate-600 shadow-sm"
                            role="status"
                        >
                            Loading…
                        </p>
                    )}

                    {queryRead && !workerId && (
                        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                            A Worker ID is required to view task details in this
                            prototype. Return to the task list and open a task
                            with its worker context.
                        </p>
                    )}

                    {queryRead && workerId && reportLoading && (
                        <p
                            className="mt-5 rounded-lg bg-white p-5 text-sm text-slate-600 shadow-sm"
                            role="status"
                        >
                            Loading task report…
                        </p>
                    )}

                    {queryRead && workerId && !reportLoading && reportError && (
                        <p
                            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
                            role="alert"
                        >
                            {reportError}
                        </p>
                    )}

                    {queryRead && workerId && !reportLoading && report && (
                        <div className="mt-5 space-y-5">
                            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-medium text-slate-500">
                                    {report.reportCode}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Report ID: {report.id}
                                </p>
                                <h2 className="mt-4 text-xl font-semibold">
                                    {report.title}
                                </h2>
                                {report.description && (
                                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                                        {report.description}
                                    </p>
                                )}

                                <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs text-slate-500">
                                            Category
                                        </dt>
                                        <dd className="mt-1 text-sm">
                                            {report.category}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">
                                            Location
                                        </dt>
                                        <dd className="mt-1 text-sm">
                                            {report.location}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">
                                            Priority
                                        </dt>
                                        <dd className="mt-1 text-sm capitalize">
                                            {report.priority}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">
                                            Current status
                                        </dt>
                                        <dd className="mt-1 text-sm capitalize">
                                            {report.status.replaceAll('_', ' ')}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">
                                            Reporter
                                        </dt>
                                        <dd className="mt-1 text-sm">
                                            {report.reporterId ||
                                                'Not available'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">
                                            Assigned worker
                                        </dt>
                                        <dd className="mt-1 text-sm">
                                            {report.assignedWorkerId ||
                                                'Not available'}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            {workerId && (
                                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-semibold">
                                        Task progress
                                    </h2>
                                    {workerAction ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void updateWorkerStatus(
                                                    workerAction.nextStatus,
                                                )
                                            }
                                            disabled={
                                                statusUpdateState ===
                                                'submitting'
                                            }
                                            className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {statusUpdateState === 'submitting'
                                                ? 'Updating…'
                                                : workerAction.label}
                                        </button>
                                    ) : (
                                        <p className="mt-3 text-sm text-slate-600">
                                            There is currently no Worker action
                                            available for this status.
                                        </p>
                                    )}
                                    {statusUpdateMessage && (
                                        <p
                                            className={`mt-3 text-sm ${statusUpdateState === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
                                            role={
                                                statusUpdateState === 'error'
                                                    ? 'alert'
                                                    : 'status'
                                            }
                                        >
                                            {statusUpdateMessage}
                                        </p>
                                    )}
                                </section>
                            )}

                            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Work history
                                </h2>

                                {workerIsAssigned ? (
                                    <form
                                        className="mt-4 border-b border-slate-100 pb-5"
                                        onSubmit={(event) =>
                                            void submitWorkLog(event)
                                        }
                                    >
                                        <label
                                            htmlFor="workNote"
                                            className="block text-sm font-medium text-slate-700"
                                        >
                                            Work note
                                        </label>
                                        <textarea
                                            id="workNote"
                                            className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                            value={workNote}
                                            maxLength={2000}
                                            required
                                            onChange={(event) => {
                                                setWorkNote(event.target.value);
                                                setWorkLogState('idle');
                                                setWorkLogMessage('');
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={
                                                workLogState === 'submitting' ||
                                                !workNote.trim()
                                            }
                                            className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {workLogState === 'submitting'
                                                ? 'Adding…'
                                                : 'Add Work Log'}
                                        </button>
                                        {workLogMessage && (
                                            <p
                                                className={`mt-3 text-sm ${workLogState === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
                                                role={
                                                    workLogState === 'error'
                                                        ? 'alert'
                                                        : 'status'
                                                }
                                            >
                                                {workLogMessage}
                                            </p>
                                        )}
                                    </form>
                                ) : workerId ? (
                                    <p className="mt-3 text-sm text-amber-800">
                                        Only the Worker assigned to this report
                                        can add work notes or proof.
                                    </p>
                                ) : null}

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
                                        <p className="mt-4 text-sm text-slate-600">
                                            No work history is available for
                                            this task yet.
                                        </p>
                                    )}

                                {!workLogsLoading &&
                                    !workLogsError &&
                                    workLogs.length > 0 && (
                                        <ul className="mt-3 divide-y divide-slate-100">
                                            {workLogs.map((log) => (
                                                <li
                                                    key={log.id}
                                                    className="py-4 first:pt-1 last:pb-1"
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
                                                        Actor:{' '}
                                                        {log.workerId ||
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
                                                    {log.beforeImage &&
                                                        (proofSource(
                                                            log.beforeImage,
                                                        ) ? (
                                                            <img
                                                                src={proofSource(
                                                                    log.beforeImage,
                                                                )!}
                                                                alt="Before work evidence"
                                                                className="mt-3 max-h-64 rounded-lg border border-slate-200 object-contain"
                                                            />
                                                        ) : (
                                                            <p className="mt-2 text-xs text-slate-500">
                                                                Before image
                                                                reference:{' '}
                                                                {
                                                                    log.beforeImage
                                                                }
                                                            </p>
                                                        ))}
                                                    {log.afterImage &&
                                                        (proofSource(
                                                            log.afterImage,
                                                        ) ? (
                                                            <img
                                                                src={proofSource(
                                                                    log.afterImage,
                                                                )!}
                                                                alt="Work completion proof"
                                                                className="mt-3 max-h-64 rounded-lg border border-slate-200 object-contain"
                                                            />
                                                        ) : (
                                                            <p className="mt-2 text-xs text-slate-500">
                                                                After image
                                                                reference:{' '}
                                                                {log.afterImage}
                                                            </p>
                                                        ))}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                            </section>

                            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Completion Proof
                                </h2>
                                {workerIsAssigned ? (
                                    <form
                                        className="mt-4"
                                        onSubmit={(event) =>
                                            void uploadProof(event)
                                        }
                                    >
                                        <label
                                            htmlFor="proofFile"
                                            className="block text-sm font-medium text-slate-700"
                                        >
                                            Choose an image
                                        </label>
                                        <input
                                            ref={proofInputRef}
                                            id="proofFile"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="mt-2 block w-full text-sm text-slate-700"
                                            onChange={(event) =>
                                                selectProof(
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                        {proofFile && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                Selected: {proofFile.name}
                                            </p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={
                                                proofState === 'submitting' ||
                                                !proofFile ||
                                                proofState === 'error'
                                            }
                                            className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {proofState === 'submitting'
                                                ? 'Uploading…'
                                                : 'Upload Proof'}
                                        </button>
                                        {proofMessage && (
                                            <p
                                                className={`mt-3 text-sm ${proofState === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
                                                role={
                                                    proofState === 'error'
                                                        ? 'alert'
                                                        : 'status'
                                                }
                                            >
                                                {proofMessage}
                                            </p>
                                        )}
                                    </form>
                                ) : workerId ? (
                                    <p className="mt-3 text-sm text-amber-800">
                                        Only the Worker assigned to this report
                                        can upload completion proof.
                                    </p>
                                ) : (
                                    <p className="mt-3 text-sm text-slate-600">
                                        A Worker ID is required to upload proof.
                                    </p>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
