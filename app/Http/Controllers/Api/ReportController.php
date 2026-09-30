<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['sometimes', Rule::in(Report::STATUSES)],
            'priority' => ['sometimes', Rule::in(Report::PRIORITIES)],
            'category' => ['sometimes', Rule::in(Report::CATEGORIES)],
            'search' => ['sometimes', 'string', 'max:120'],
            'reporterId' => ['sometimes', 'string', 'max:64'],
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

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Report::STATUSES)],
        ]);

        $report = Report::find($id);
        abort_if($report === null, 404, 'Report not found.');

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
