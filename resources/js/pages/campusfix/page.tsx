import { Head } from '@inertiajs/react';

type Props = {
    title: string;
    description: string;
};

export default function CampusFixPage({ title, description }: Props) {
    return (
        <>
            <Head title={title} />
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
                <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                    <p className="text-sm font-semibold tracking-wide text-blue-700">
                        CAMPUSFIX
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    <p className="mt-3 leading-7 text-slate-600">
                        {description}
                    </p>
                    <p className="mt-8 border-t border-slate-100 pt-5 text-sm text-slate-500">
                        Campus facility reports, tracked from submission to
                        resolution.
                    </p>
                </section>
            </main>
        </>
    );
}
