import { Head } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';

const categories = [
    'Electrical',
    'HVAC',
    'Furniture',
    'Cleaning',
    'Internet',
    'Other',
] as const;

const priorities = ['low', 'medium', 'high'] as const;

type Category = (typeof categories)[number];
type Priority = (typeof priorities)[number];
type FormField =
    | 'title'
    | 'description'
    | 'category'
    | 'location'
    | 'priority'
    | 'image';

type FormValues = {
    title: string;
    description: string;
    category: Category | '';
    location: string;
    priority: Priority;
    image: string;
};

type DemoUser = {
    id: string;
    name: string;
    role: string;
};

const initialForm: FormValues = {
    title: '',
    description: '',
    category: '',
    location: '',
    priority: 'medium',
    image: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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

function validationMessages(
    payload: unknown,
): Partial<Record<FormField, string>> {
    if (!isRecord(payload) || !isRecord(payload.errors)) {
        return {};
    }

    const fields: FormField[] = [
        'title',
        'description',
        'category',
        'location',
        'priority',
        'image',
    ];
    const messages: Partial<Record<FormField, string>> = {};

    for (const field of fields) {
        const fieldMessages = payload.errors[field];
        if (
            Array.isArray(fieldMessages) &&
            typeof fieldMessages[0] === 'string'
        ) {
            messages[field] = fieldMessages[0];
        }
    }

    return messages;
}

function responseMessage(payload: unknown, fallback: string): string {
    return isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : fallback;
}

const inputClassName =
    'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'text-sm font-medium text-slate-800';

export default function CreateReport() {
    const [form, setForm] = useState<FormValues>(initialForm);
    const [reporter, setReporter] = useState<DemoUser | null>(null);
    const [loadingReporter, setLoadingReporter] = useState(true);
    const [reporterError, setReporterError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<
        Partial<Record<FormField, string>>
    >({});
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadReporter() {
            try {
                const response = await fetch('/api/users', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const payload: unknown = await readJson(response);

                if (!response.ok || !Array.isArray(payload)) {
                    throw new Error(
                        responseMessage(
                            payload,
                            'Could not load the demo account.',
                        ),
                    );
                }

                const users: unknown[] = payload;
                const civitas = users.find(
                    (user): user is DemoUser =>
                        isDemoUser(user) &&
                        user.role === 'civitas' &&
                        user.name === 'Alya Pratama',
                );

                if (!civitas) {
                    throw new Error(
                        'The seeded Civitas account Alya Pratama was not found.',
                    );
                }

                setReporter(civitas);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setReporterError(
                        error instanceof Error
                            ? error.message
                            : 'Could not load the demo account.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingReporter(false);
                }
            }
        }

        void loadReporter();

        return () => controller.abort();
    }, []);

    async function submitReport(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!reporter || submitting) {
            return;
        }

        setSubmitting(true);
        setApiError('');
        setFieldErrors({});

        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reporterId: reporter.id,
                    title: form.title.trim(),
                    description: form.description.trim(),
                    category: form.category,
                    location: form.location.trim(),
                    priority: form.priority,
                    image: form.image.trim() || null,
                }),
            });
            const payload: unknown = await readJson(response);

            if (response.status === 422) {
                setFieldErrors(validationMessages(payload));
                setApiError(
                    responseMessage(
                        payload,
                        'Please check the report details.',
                    ),
                );
                return;
            }

            if (!response.ok) {
                throw new Error(
                    responseMessage(
                        payload,
                        'The report could not be submitted.',
                    ),
                );
            }

            if (
                !isRecord(payload) ||
                typeof payload.id !== 'string' ||
                typeof payload.reportCode !== 'string' ||
                payload.status !== 'reported'
            ) {
                throw new Error(
                    'The report was submitted, but its detail link could not be read.',
                );
            }

            window.location.assign(
                `/reports/${encodeURIComponent(payload.id)}`,
            );
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : 'A network error prevented report submission.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <Head title="Create a report" />
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
                            className="text-sm font-medium text-slate-600 hover:text-blue-700"
                        >
                            My reports
                        </a>
                    </div>
                </header>

                <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
                    <a
                        href="/dashboard"
                        className="text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                        ← Back to dashboard
                    </a>

                    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                        <div className="mb-8">
                            <p className="text-sm font-semibold text-blue-700">
                                CIVITAS · FACILITY REPORT
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                                Report a campus issue
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Tell the facilities team what needs attention
                                and where to find it.
                            </p>
                        </div>

                        <div className="mb-7 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                            {loadingReporter ? (
                                <span role="status">
                                    Loading demo Civitas account…
                                </span>
                            ) : reporter ? (
                                <span>
                                    Submitting as{' '}
                                    <strong>{reporter.name}</strong>
                                </span>
                            ) : (
                                <span role="alert">{reporterError}</span>
                            )}
                        </div>

                        {apiError && (
                            <div
                                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                                role="alert"
                            >
                                {apiError}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={submitReport}>
                            <div>
                                <label
                                    className={labelClassName}
                                    htmlFor="title"
                                >
                                    Issue title
                                </label>
                                <input
                                    id="title"
                                    className={inputClassName}
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                    maxLength={120}
                                    required
                                    aria-invalid={Boolean(fieldErrors.title)}
                                />
                                {fieldErrors.title && (
                                    <p className="mt-1 text-sm text-red-700">
                                        {fieldErrors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    className={labelClassName}
                                    htmlFor="description"
                                >
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    className={`${inputClassName} min-h-32 resize-y`}
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            description: event.target.value,
                                        }))
                                    }
                                    maxLength={3000}
                                    required
                                    aria-invalid={Boolean(
                                        fieldErrors.description,
                                    )}
                                />
                                {fieldErrors.description && (
                                    <p className="mt-1 text-sm text-red-700">
                                        {fieldErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div>
                                    <label
                                        className={labelClassName}
                                        htmlFor="category"
                                    >
                                        Category
                                    </label>
                                    <select
                                        id="category"
                                        className={inputClassName}
                                        value={form.category}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                category: event.target.value as
                                                    | Category
                                                    | '',
                                            }))
                                        }
                                        required
                                        aria-invalid={Boolean(
                                            fieldErrors.category,
                                        )}
                                    >
                                        <option value="" disabled>
                                            Select a category
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
                                    {fieldErrors.category && (
                                        <p className="mt-1 text-sm text-red-700">
                                            {fieldErrors.category}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={labelClassName}
                                        htmlFor="priority"
                                    >
                                        Priority
                                    </label>
                                    <select
                                        id="priority"
                                        className={inputClassName}
                                        value={form.priority}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                priority: event.target
                                                    .value as Priority,
                                            }))
                                        }
                                        aria-invalid={Boolean(
                                            fieldErrors.priority,
                                        )}
                                    >
                                        {priorities.map((priority) => (
                                            <option
                                                key={priority}
                                                value={priority}
                                            >
                                                {priority
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    priority.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.priority && (
                                        <p className="mt-1 text-sm text-red-700">
                                            {fieldErrors.priority}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label
                                    className={labelClassName}
                                    htmlFor="location"
                                >
                                    Campus location
                                </label>
                                <input
                                    id="location"
                                    className={inputClassName}
                                    value={form.location}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            location: event.target.value,
                                        }))
                                    }
                                    maxLength={160}
                                    placeholder="Building, floor, and room"
                                    required
                                    aria-invalid={Boolean(fieldErrors.location)}
                                />
                                {fieldErrors.location && (
                                    <p className="mt-1 text-sm text-red-700">
                                        {fieldErrors.location}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    className={labelClassName}
                                    htmlFor="image"
                                >
                                    Image placeholder{' '}
                                    <span className="font-normal text-slate-500">
                                        (optional)
                                    </span>
                                </label>
                                <input
                                    id="image"
                                    className={inputClassName}
                                    value={form.image}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            image: event.target.value,
                                        }))
                                    }
                                    maxLength={2048}
                                    placeholder="placeholders/report-image.svg"
                                    aria-invalid={Boolean(fieldErrors.image)}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Enter a local placeholder path. File uploads
                                    are not enabled yet.
                                </p>
                                {fieldErrors.image && (
                                    <p className="mt-1 text-sm text-red-700">
                                        {fieldErrors.image}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                                <a
                                    href="/dashboard"
                                    className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </a>
                                <button
                                    type="submit"
                                    disabled={
                                        loadingReporter ||
                                        !reporter ||
                                        submitting
                                    }
                                    className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                    {submitting
                                        ? 'Submitting report…'
                                        : 'Submit report'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </main>
        </>
    );
}
