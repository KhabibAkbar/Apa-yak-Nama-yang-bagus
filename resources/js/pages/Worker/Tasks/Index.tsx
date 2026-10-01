import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: string;
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
        typeof value.status === 'string'
    );
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export default function WorkerTaskList() {
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [queryRead, setQueryRead] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

        async function loadTasks() {
            setLoading(true);
            setError('');

            try {
                const params = new URLSearchParams({
                    assigned_worker_id: selectedWorkerId,
                });
                const response = await fetch(`/api/reports?${params}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const payload = await readJson(response);

                if (
                    !response.ok ||
                    !Array.isArray(payload) ||
                    !payload.every(isReport)
                ) {
                    const message =
                        isRecord(payload) && typeof payload.message === 'string'
                            ? payload.message
                            : 'Could not load this worker’s tasks.';
                    throw new Error(message);
                }

                setReports(payload);
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'A network error prevented the tasks from loading.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadTasks();
        return () => controller.abort();
    }, [queryRead, workerId]);

    return (
        <>
            <Head title="Worker tasks" />
            <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-blue-700">
                                CAMPUSFIX WORKER
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold">
                                Assigned tasks
                            </h1>
                        </div>
                        <a
                            href={
                                workerId
                                    ? `/worker?worker_id=${encodeURIComponent(workerId)}`
                                    : '/worker'
                            }
                            className="text-sm font-medium text-blue-700 hover:underline"
                        >
                            Back to dashboard
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
                            A Worker ID is required to view tasks in this
                            prototype. Open this page with{' '}
                            <code className="rounded bg-amber-100 px-1 py-0.5">
                                ?worker_id=YOUR_WORKER_ID
                            </code>
                            .
                        </p>
                    )}

                    {queryRead && workerId && loading && (
                        <p
                            className="mt-5 rounded-lg bg-white p-5 text-sm text-slate-600 shadow-sm"
                            role="status"
                        >
                            Loading assigned tasks…
                        </p>
                    )}

                    {queryRead && workerId && !loading && error && (
                        <p
                            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    {queryRead &&
                        workerId &&
                        !loading &&
                        !error &&
                        reports.length === 0 && (
                            <p className="mt-5 rounded-lg bg-white p-5 text-sm text-slate-600 shadow-sm">
                                No tasks are currently assigned to this worker.
                            </p>
                        )}

                    {queryRead &&
                        workerId &&
                        !loading &&
                        !error &&
                        reports.length > 0 && (
                            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">
                                                Report
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Category
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Location
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Priority
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Task
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reports.map((report) => (
                                            <tr key={report.id}>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium">
                                                        {report.reportCode}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-slate-500">
                                                        {report.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.title}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.category}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.location}
                                                </td>
                                                <td className="px-4 py-3 capitalize">
                                                    {report.priority}
                                                </td>
                                                <td className="px-4 py-3 capitalize">
                                                    {report.status.replaceAll(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <a
                                                        href={`/worker/tasks/${encodeURIComponent(report.id)}?worker_id=${encodeURIComponent(workerId)}`}
                                                        className="font-medium text-blue-700 hover:underline"
                                                    >
                                                        Open task
                                                    </a>
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
