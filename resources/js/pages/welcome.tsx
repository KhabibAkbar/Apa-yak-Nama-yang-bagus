import { Head } from '@inertiajs/react';

const workflowSteps = [
    {
        number: '01',
        title: 'Report',
        description:
            'Civitas shares what is wrong and where it needs attention.',
    },
    {
        number: '02',
        title: 'Assign',
        description:
            'Management reviews the report and assigns a facilities worker.',
    },
    {
        number: '03',
        title: 'Work',
        description:
            'The worker records progress and submits completion proof.',
    },
    {
        number: '04',
        title: 'Verify',
        description:
            'Management checks the submitted work before closing the report.',
    },
    {
        number: '05',
        title: 'Resolve',
        description: 'Civitas can follow the final status and report history.',
    },
] as const;

const features = [
    {
        title: 'Easy facility reporting',
        description:
            'Send a clear issue report with its category and campus location.',
    },
    {
        title: 'Visible progress',
        description:
            'Follow report status and review its work history as it changes.',
    },
    {
        title: 'Worker task management',
        description: 'Workers can access assigned tasks and record work notes.',
    },
    {
        title: 'Proof and verification',
        description:
            'Completion evidence is available for management to verify.',
    },
] as const;

export default function Welcome() {
    return (
        <>
            <Head title="CampusFix | Campus facility reporting" />
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <nav
                        aria-label="Main navigation"
                        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8"
                    >
                        <a
                            href="/"
                            className="text-xl font-bold tracking-tight text-blue-800"
                        >
                            CampusFix
                        </a>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
                            <a href="/" className="hover:text-blue-700">
                                Home
                            </a>
                            <a
                                href="/reports/create"
                                className="hover:text-blue-700"
                            >
                                Report an issue
                            </a>
                            <a href="/reports" className="hover:text-blue-700">
                                My reports
                            </a>
                            <a
                                href="/reports/create"
                                className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                            >
                                Open prototype
                            </a>
                        </div>
                    </nav>
                </header>

                <section className="bg-white">
                    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-24">
                        <div>
                            <p className="text-sm font-semibold tracking-wide text-blue-700 uppercase">
                                Campus facility reporting
                            </p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                                A clearer way to fix campus issues.
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                                CampusFix helps the campus community report
                                facility problems and follow them from review
                                through verified resolution.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href="/reports/create"
                                    className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
                                    Report a problem
                                </a>
                                <a
                                    href="/reports"
                                    className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
                                    Track my reports
                                </a>
                            </div>
                        </div>
                        <aside className="rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
                            <p className="text-sm font-semibold text-blue-800">
                                From report to resolution
                            </p>
                            <ol className="mt-5 space-y-4">
                                {workflowSteps.map((step) => (
                                    <li
                                        key={step.number}
                                        className="flex gap-4"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-800 ring-1 ring-blue-100">
                                            {step.number}
                                        </span>
                                        <div>
                                            <h2 className="font-semibold text-slate-900">
                                                {step.title}
                                            </h2>
                                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                                {step.description}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </aside>
                    </div>
                </section>

                <section
                    aria-labelledby="how-it-works"
                    className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16"
                >
                    <div className="max-w-2xl">
                        <h2
                            id="how-it-works"
                            className="text-2xl font-semibold tracking-tight sm:text-3xl"
                        >
                            How CampusFix works
                        </h2>
                        <p className="mt-3 leading-7 text-slate-600">
                            Each report moves through a straightforward process
                            with clear ownership and a final check.
                        </p>
                    </div>
                    <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {workflowSteps.map((step, index) => (
                            <li
                                key={step.number}
                                className="rounded-xl border border-slate-200 bg-white p-5"
                            >
                                <p className="text-xs font-semibold tracking-wide text-blue-700">
                                    STEP {step.number}
                                </p>
                                <h3 className="mt-2 font-semibold">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {step.description}
                                </p>
                                {index < workflowSteps.length - 1 && (
                                    <span className="sr-only">Then</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>

                <section
                    aria-labelledby="benefits"
                    className="border-y border-slate-200 bg-white"
                >
                    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
                        <h2
                            id="benefits"
                            className="text-2xl font-semibold tracking-tight sm:text-3xl"
                        >
                            Built for practical campus follow-through
                        </h2>
                        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {features.map((feature) => (
                                <li
                                    key={feature.title}
                                    className="rounded-xl border border-slate-200 p-5"
                                >
                                    <h3 className="font-semibold">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {feature.description}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section
                    aria-labelledby="demo-access"
                    className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16"
                >
                    <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <h2
                                id="demo-access"
                                className="text-2xl font-semibold tracking-tight sm:text-3xl"
                            >
                                Explore the prototype
                            </h2>
                            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                                These demo areas use prototype identities and do
                                not require sign-in.
                            </p>
                        </div>
                        <a
                            href="/reports/create"
                            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                        >
                            Start with a report →
                        </a>
                    </div>
                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                        <a
                            href="/reports"
                            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300"
                        >
                            <h3 className="font-semibold">
                                Civitas · My Reports
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Submit a facility issue and follow Alya’s demo
                                reports.
                            </p>
                        </a>
                        <a
                            href="/management"
                            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300"
                        >
                            <h3 className="font-semibold">Management</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Review reports, assign workers, and verify
                                completed work.
                            </p>
                        </a>
                        <a
                            href="/worker?worker_id=6abd685535b63a47a00a64b7"
                            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300"
                        >
                            <h3 className="font-semibold">Worker tasks</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Open Dimas Saputra’s assigned tasks in the demo.
                            </p>
                        </a>
                    </div>
                </section>

                <footer className="border-t border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-slate-500 sm:px-8">
                        <span className="font-semibold text-slate-700">
                            CampusFix
                        </span>
                        <p>
                            Hackathon prototype · Campus facility reports from
                            submission to resolution.
                        </p>
                    </div>
                </footer>
            </main>
        </>
    );
}
