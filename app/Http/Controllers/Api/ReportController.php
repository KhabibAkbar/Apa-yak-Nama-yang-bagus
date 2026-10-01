<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    private const WORKER_STATUS_TRANSITIONS = [
        'assigned' => ['in_progress'],
        'in_progress' => ['waiting_verification'],
        'reopened' => ['in_progress'],
    ];

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['sometimes', Rule::in(Report::STATUSES)],
            'priority' => ['sometimes', Rule::in(Report::PRIORITIES)],
            'category' => ['sometimes', Rule::in(Report::CATEGORIES)],
            'search' => ['sometimes', 'string', 'max:120'],
            'reporterId' => ['sometimes', 'string', 'max:64'],
            'assigned_worker_id' => ['sometimes', 'required', 'string', 'regex:/^[a-fA-F0-9]{24}$/'],
        ]);

        $query = Report::query();

        foreach (['status', 'priority', 'category'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->string($filter)->toString());
            }
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('reportCode', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($request->filled('reporterId')) {
            $query->where('reporterId', $request->string('reporterId')->toString());
        }

        if ($request->filled('assigned_worker_id')) {
            $query->where('assignedWorkerId', $request->string('assigned_worker_id')->toString());
        }

        return response()->json($query->orderBy('createdAt', 'desc')->get());
    }

    public function show(string $id): JsonResponse
    {
        $report = Report::find($id);

        abort_if($report === null, 404, 'Report not found.');

        return response()->json($report);
    }

    public function workLogs(string $id): JsonResponse
    {
        $report = Report::find($id);

        abort_if($report === null, 404, 'Report not found.');

        return response()->json(
            WorkLog::where('reportId', (string) $report->getKey())
                ->orderBy('createdAt', 'desc')
                ->get(),
        );
    }

    public function storeWorkLog(Request $request, string $id): JsonResponse
    {
        [$report, $worker] = $this->assignedWorkerContext($request, $id);

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $workLog = WorkLog::create([
            'reportId' => (string) $report->getKey(),
            'workerId' => (string) $worker->getKey(),
            'status' => (string) $report->status,
            'note' => $validated['note'],
        ]);

        return response()->json($workLog, 201);
    }

    public function storeProof(Request $request, string $id): JsonResponse
    {
        [$report, $worker] = $this->assignedWorkerContext($request, $id);

        $validated = $request->validate([
            'proof' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $proof = $validated['proof'];
        $path = $proof->store('report-proofs/'.(string) $report->getKey(), 'public');

        if ($path === false) {
            return response()->json(['message' => 'The proof file could not be stored.'], 500);
        }

        try {
            $workLog = WorkLog::create([
                'reportId' => (string) $report->getKey(),
                'workerId' => (string) $worker->getKey(),
                'status' => (string) $report->status,
                'note' => 'Completion proof uploaded: '.Str::limit($proof->getClientOriginalName(), 180),
                'afterImage' => $path,
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }

        return response()->json($workLog, 201);
    }

    /**
     * @return array{Report, User}
     */
    private function assignedWorkerContext(Request $request, string $id): array
    {
        $validated = $request->validate([
            'worker_id' => ['required', 'string', 'regex:/^[a-fA-F0-9]{24}$/'],
        ]);

        $report = Report::find($id);
        abort_if($report === null, 404, 'Report not found.');

        $worker = User::find($validated['worker_id']);
        abort_if($worker === null, 404, 'Worker not found.');
        abort_unless($worker->role === 'worker', 403, 'A Worker account is required.');
        abort_unless(
            (string) $report->assignedWorkerId === (string) $worker->getKey(),
            403,
            'This report is not assigned to the selected worker.',
        );

        return [$report, $worker];
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Report::STATUSES)],
            'worker_id' => ['sometimes', 'required', 'string', 'regex:/^[a-fA-F0-9]{24}$/'],
        ]);

        $report = Report::find($id);
        abort_if($report === null, 404, 'Report not found.');

        if (array_key_exists('worker_id', $validated)) {
            $worker = User::find($validated['worker_id']);
            abort_if($worker === null, 404, 'Worker not found.');
            abort_unless($worker->role === 'worker', 403, 'A Worker account is required.');
            abort_unless(
                (string) $report->assignedWorkerId === (string) $worker->getKey(),
                403,
                'This report is not assigned to the selected worker.',
            );

            $allowedStatuses = self::WORKER_STATUS_TRANSITIONS[$report->status] ?? [];
            abort_unless(
                in_array($validated['status'], $allowedStatuses, true),
                422,
                'This status transition is not allowed for a Worker.',
            );
        }

        $report->status = $validated['status'];
        $report->save();

        return response()->json($report->refresh());
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'workerId' => ['required', 'string', 'max:64'],
        ]);

        $report = Report::find($id);
        abort_if($report === null, 404, 'Report not found.');

        abort_unless(
            in_array($report->status, ['reported', 'under_review', 'assigned'], true),
            422,
            'This report can no longer be assigned in its current status.',
        );

        $worker = User::whereKey($validated['workerId'])->first();
        abort_unless(
            $worker !== null && $worker->role === 'worker',
            422,
            'Choose a valid worker account.',
        );

        $workerId = (string) $worker->getKey();
        $alreadyAssigned = $report->status === 'assigned'
            && (string) $report->assignedWorkerId === $workerId;

        if (! $alreadyAssigned) {
            $report->assignedWorkerId = $workerId;
            $report->status = 'assigned';
            $report->save();

            WorkLog::create([
                'reportId' => (string) $report->getKey(),
                'workerId' => $workerId,
                'status' => 'assigned',
                'note' => "Assigned to {$worker->name} by management.",
            ]);
        }

        return response()->json($report->refresh());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reporterId' => ['required', 'string'],
            'title' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:3000'],
            'category' => ['required', Rule::in(Report::CATEGORIES)],
            'location' => ['required', 'string', 'max:160'],
            'priority' => ['required', Rule::in(Report::PRIORITIES)],
            'image' => ['nullable', 'string', 'max:2048'],
        ]);

        abort_unless(User::whereKey($validated['reporterId'])->exists(), 422, 'Reporter not found.');

        $report = Report::create([
            ...$validated,
            'reportCode' => 'CF-'.Str::upper(Str::random(6)),
            'status' => 'reported',
        ]);

        return response()->json($report, 201);
    }
}
