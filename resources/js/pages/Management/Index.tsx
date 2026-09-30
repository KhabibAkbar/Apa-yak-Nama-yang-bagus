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
const priorities = ['low', 'medium', 'high'] as const;
const categories = [
    'Electrical',
    'HVAC',
    'Furniture',
    'Cleaning',
    'Internet',
    'Other',
] as const;

type ReportStatus = (typeof statuses)[number];
type ReportPriority = (typeof priorities)[number];
type Report = {
    id: string;
    reportCode: string;
    title: string;
    category: string;
    location: string;
    priority: ReportPriority;
    status: ReportStatus;
    assignedWorkerId?: string | null;
    createdAt: string;
};
type User = { id: string; name: string; role: string };
type Filters = {
    search: string;
    status: string;
    priority: string;
    category: string;
};

const emptyFilters: Filters = {
    search: '',
    status: '',
    priority: '',
    category: '',
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
        priorities.includes(value.priority as ReportPriority) &&
        statuses.includes(value.status as ReportStatus) &&
        typeof value.createdAt === 'string' &&
        (typeof value.assignedWorkerId === 'string' ||
            value.assignedWorkerId === null ||
            value.assignedWorkerId === undefined)
    );
}

function isUser(value: unknown): value is User {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.role === 'string'
    );
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal,
    });
    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }
    if (!response.ok) {
        const message =
            isRecord(payload) && typeof payload.message === 'string'
                ? payload.message
                : 'The dashboard data could not be loaded.';
        throw new Error(message);
    }
    return payload;
}

function statusLabel(status: ReportStatus): string {
    return status.replaceAll('_', ' ');
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(date);
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

const priorityClasses: Record<ReportPriority, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-rose-100 text-rose-800',
};

const inputClassName =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100';

export default function ManagementDashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    const [workers, setWorkers] = useState<User[]>([]);
    const [filters, setFilters] = useState<Filters>(emptyFilters);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredReports, setFilteredReports] = useState<Report[] | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterError, setFilterError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        async function loadDashboard() {
            setLoading(true);
            setError('');
            try {
                const [reportPayload, userPayload] = await Promise.all([
                    fetchJson('/api/reports', controller.signal),
                    fetchJson('/api/users', controller.signal),
                ]);
                if (
                    !Array.isArray(reportPayload) ||
                    !reportPayload.every(isReport) ||
                    !Array.isArray(userPayload) ||
                    !userPayload.every(isUser)
                ) {
                    throw new Error('The dashboard received unexpected data.');
                }
                setReports(reportPayload);
                setWorkers(
                    userPayload.filter((user) => user.role === 'worker'),
                );
            } catch (loadError) {
                if (!controller.signal.aborted) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'The dashboard data could not be loaded.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void loadDashboard();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearchQuery(filters.search.trim());
        }, 250);
        return () => window.clearTimeout(timer);
    }, [filters.search]);

    useEffect(() => {
        const hasFilters = Boolean(
            searchQuery ||
            filters.status ||
            filters.priority ||
            filters.category,
        );
        if (!hasFilters) {
            setFilteredReports(null);
            setFilterError('');
            setFilterLoading(false);
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.status) params.set('status', filters.status);
        if (filters.priority) params.set('priority', filters.priority);
        if (filters.category) params.set('category', filters.category);

        async function loadFilteredReports() {
            setFilterLoading(true);
            setFilterError('');
            try {
                const payload = await fetchJson(
                    `/api/reports?${params.toString()}`,
                    controller.signal,
                );
                if (!Array.isArray(payload) || !payload.every(isReport)) {
                    throw new Error('The filtered reports could not be read.');
                }
                setFilteredReports(payload);
            } catch (filterLoadError) {
                if (!controller.signal.aborted) {
                    setFilterError(
                        filterLoadError instanceof Error
                            ? filterLoadError.message
                            : 'The filtered reports could not be loaded.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) setFilterLoading(false);
            }
        }
        void loadFilteredReports();
        return () => controller.abort();
    }, [filters.category, filters.priority, filters.status, searchQuery]);

    const workerNames = useMemo(
        () => new Map(workers.map((worker) => [worker.id, worker.name])),
        [workers],
    );
    const summary = useMemo(() => {
        const pendingStatuses: ReportStatus[] = [
            'reported',
            'under_review',
            'assigned',
        ];
        return [
            { label: 'Total reports', value: reports.length },
            {
                label: 'Pending reports',
                value: reports.filter((report) =>
                    pendingStatuses.includes(report.status),
                ).length,
            },
            {
                label: 'In progress',
                value: reports.filter(
                    (report) => report.status === 'in_progress',
                ).length,
            },
            {
                label: 'Waiting verification',
                value: reports.filter(
                    (report) => report.status === 'waiting_verification',
                ).length,
            },
            {
                label: 'Resolved',
                value: reports.filter((report) => report.status === 'resolved')
                    .length,
            },
            {
                label: 'High priority',
                value: reports.filter((report) => report.priority === 'high')
                    .length,
            },
        ];
    }, [reports]);
    const highPriorityReports = reports.filter(
        (report) => report.priority === 'high',
    );
    const visibleReports = filteredReports ?? reports;
    const recentReports = visibleReports.slice(0, 5);

    function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    return (
        <>
            <Head title="Management dashboard" />
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                        <a
                            href="/"
                            className="text-lg font-bold tracking-tight text-blue-800"
                        >
                            CampusFix
                        </a>
                        <nav className="flex items-center gap-5 text-sm font-medium">
                            <span className="text-slate-500">Management</span>
                            <a
                                href="/reports/create"
                                className="text-blue-700 hover:text-blue-900"
                            >
                                Civitas report form
                            </a>
                        </nav>
                    </div>
                </header>

                <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-blue-700">
                            CAMPUS OPERATIONS
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                            Management dashboard
                        </h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Read-only overview of current campus facility
                            reports.
                        </p>
                    </div>

                    {loading && (
                        <div
                            className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
                            role="status"
                        >
                            Loading management dashboard…
                        </div>
                    )}
                    {!loading && error && (
                        <div
                            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <section
                                aria-label="Report summary"
                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
                            >
                                {summary.map((item) => (
                                    <article
                                        key={item.label}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <p className="text-sm font-medium text-slate-500">
                                            {item.label}
                                        </p>
                                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                                            {item.value}
                                        </p>
                                    </article>
                                ))}
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Recent reports
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Latest reports, with filters applied
                                        through the reports API.
                                    </p>
                                </div>
                                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <label className="text-xs font-semibold text-slate-600">
                                        Search
                                        <input
                                            className={`${inputClassName} mt-1.5`}
                                            value={filters.search}
                                            onChange={(event) =>
                                                updateFilter(
                                                    'search',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Title, code, or location"
                                        />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600">
                                        Status
                                        <select
                                            className={`${inputClassName} mt-1.5`}
                                            value={filters.status}
                                            onChange={(event) =>
                                                updateFilter(
                                                    'status',
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                All statuses
                                            </option>
                                            {statuses.map((status) => (
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
                                                    {statusLabel(status)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600">
                                        Priority
                                        <select
                                            className={`${inputClassName} mt-1.5`}
                                            value={filters.priority}
                                            onChange={(event) =>
                                                updateFilter(
                                                    'priority',
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                All priorities
                                            </option>
                                            {priorities.map((priority) => (
                                                <option
                                                    key={priority}
                                                    value={priority}
                                                >
                                                    {priority}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600">
                                        Category
                                        <select
                                            className={`${inputClassName} mt-1.5`}
                                            value={filters.category}
                                            onChange={(event) =>
                                                updateFilter(
                                                    'category',
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                All categories
                                            </option>
                                            {categories.map((category) => (
                                                <option
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                {filterError && (
                                    <p
                                        className="mt-4 text-sm text-red-700"
                                        role="alert"
                                    >
                                        {filterError}
                                    </p>
                                )}
                                <div className="mt-5 overflow-x-auto">
                                    {filterLoading ? (
                                        <p
                                            className="py-8 text-center text-sm text-slate-500"
                                            role="status"
                                        >
                                            Updating report results…
                                        </p>
                                    ) : recentReports.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-slate-500">
                                            No reports found.
                                        </p>
                                    ) : (
                                        <table className="w-full min-w-[850px] text-left text-sm">
                                            <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-3 py-3 font-semibold">
                                                        Report
                                                    </th>
                                                    <th className="px-3 py-3 font-semibold">
                                                        Category / location
                                                    </th>
                                                    <th className="px-3 py-3 font-semibold">
                                                        Priority
                                                    </th>
                                                    <th className="px-3 py-3 font-semibold">
                                                        Status
                                                    </th>
                                                    <th className="px-3 py-3 font-semibold">
                                                        Created
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {recentReports.map((report) => (
                                                    <tr
                                                        key={report.id}
                                                        className="align-top hover:bg-slate-50"
                                                    >
                                                        <td className="px-3 py-4">
                                                            <a
                                                                href={`/management/reports/${encodeURIComponent(report.id)}`}
                                                                className="font-semibold text-blue-700 hover:text-blue-900"
                                                            >
                                                                {
                                                                    report.reportCode
                                                                }
                                                            </a>
                                                            <p className="mt-1 font-medium text-slate-900">
                                                                {report.title}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-4 text-slate-600">
                                                            <span>
                                                                {
                                                                    report.category
                                                                }
                                                            </span>
                                                            <p className="mt-1">
                                                                {
                                                                    report.location
                                                                }
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityClasses[report.priority]}`}
                                                            >
                                                                {
                                                                    report.priority
                                                                }
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[report.status]}`}
                                                            >
                                                                {statusLabel(
                                                                    report.status,
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4 whitespace-nowrap text-slate-500">
                                                            {formatDate(
                                                                report.createdAt,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                {visibleReports.length > 5 &&
                                    !filterLoading && (
                                        <p className="mt-3 text-right text-xs text-slate-500">
                                            Showing 5 of {visibleReports.length}{' '}
                                            matching reports
                                        </p>
                                    )}
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        High-priority reports
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Reports marked high priority, for
                                        monitoring.
                                    </p>
                                </div>
                                {highPriorityReports.length === 0 ? (
                                    <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                                        No high-priority reports.
                                    </p>
                                ) : (
                                    <ul className="mt-4 divide-y divide-slate-100">
                                        {highPriorityReports.map((report) => (
                                            <li
                                                key={report.id}
                                                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <a
                                                        href={`/management/reports/${encodeURIComponent(report.id)}`}
                                                        className="font-semibold text-blue-700 hover:text-blue-900"
                                                    >
                                                        {report.reportCode}
                                                    </a>
                                                    <p className="mt-1 text-sm font-medium text-slate-900">
                                                        {report.title}
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {report.location}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 font-semibold capitalize ${statusClasses[report.status]}`}
                                                    >
                                                        {statusLabel(
                                                            report.status,
                                                        )}
                                                    </span>
                                                    <span className="text-slate-500">
                                                        {report.assignedWorkerId
                                                            ? (workerNames.get(
                                                                  report.assignedWorkerId,
                                                              ) ??
                                                              'Worker assigned')
                                                            : 'Unassigned'}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
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
