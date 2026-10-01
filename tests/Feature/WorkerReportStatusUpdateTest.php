<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkerReportStatusUpdateTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // PHPUnit defaults to SQLite, but the models use the configured MongoDB connection.
        config(['database.default' => 'mongodb']);
        DB::setDefaultConnection('mongodb');
        DB::purge('mongodb');
    }

    public function test_assigned_worker_can_perform_each_allowed_status_transition(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'assigned');

            $this->patchWorkerStatus($report, $worker, 'in_progress')
                ->assertOk()
                ->assertJsonPath('status', 'in_progress');
            $this->assertSame('in_progress', Report::find($report->getKey())?->status);

            $this->patchWorkerStatus($report, $worker, 'waiting_verification')
                ->assertOk()
                ->assertJsonPath('status', 'waiting_verification');
            $this->assertSame('waiting_verification', Report::find($report->getKey())?->status);

            $report = Report::find($report->getKey());
            $report->status = 'reopened';
            $report->save();

            $this->patchWorkerStatus($report, $worker, 'in_progress')
                ->assertOk()
                ->assertJsonPath('status', 'in_progress');
            $this->assertSame('in_progress', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_another_worker_cannot_update_the_assigned_report(): void
    {
        $assignedWorker = null;
        $requestingWorker = null;
        $report = null;

        try {
            $assignedWorker = $this->createUser('worker');
            $requestingWorker = $this->createUser('worker');
            $report = $this->createReport((string) $assignedWorker->getKey(), 'assigned');

            $this->patchWorkerStatus($report, $requestingWorker, 'in_progress')->assertForbidden();
            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$assignedWorker, $requestingWorker]);
        }
    }

    public function test_worker_cannot_update_an_unassigned_report(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport(null, 'assigned');

            $this->patchWorkerStatus($report, $worker, 'in_progress')->assertForbidden();
            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_non_worker_account_cannot_use_worker_status_updates(): void
    {
        $managementUser = null;
        $report = null;

        try {
            $managementUser = $this->createUser('management');
            $report = $this->createReport((string) $managementUser->getKey(), 'assigned');

            $this->patchWorkerStatus($report, $managementUser, 'in_progress')->assertForbidden();
            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$managementUser]);
        }
    }

    public function test_unknown_worker_returns_not_found(): void
    {
        $workerId = bin2hex(random_bytes(12));
        $report = null;

        try {
            $report = $this->createReport($workerId, 'assigned');

            $this->patchJson("/api/reports/{$report->getKey()}/status", [
                'status' => 'in_progress',
                'worker_id' => $workerId,
            ])->assertNotFound();

            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, []);
        }
    }

    public function test_worker_cannot_skip_an_allowed_status_transition(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'assigned');

            $this->patchWorkerStatus($report, $worker, 'resolved')->assertUnprocessable();
            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_invalid_status_is_rejected_for_a_worker(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'assigned');

            $this->patchWorkerStatus($report, $worker, 'not_a_status')->assertUnprocessable();
            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_empty_worker_id_is_rejected(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'assigned');

            $this->patchJson("/api/reports/{$report->getKey()}/status", [
                'status' => 'in_progress',
                'worker_id' => '',
            ])->assertUnprocessable();

            $this->assertSame('assigned', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    private function patchWorkerStatus(Report $report, User $worker, string $status)
    {
        return $this->patchJson("/api/reports/{$report->getKey()}/status", [
            'status' => $status,
            'worker_id' => (string) $worker->getKey(),
        ]);
    }

    private function createUser(string $role): User
    {
        return User::create([
            'name' => 'Temporary worker status '.Str::random(8),
            'role' => $role,
            'department' => 'Automated test fixture',
            'avatar' => null,
        ]);
    }

    private function createReport(?string $workerId, string $status): Report
    {
        return Report::create([
            'reportCode' => 'CF-WORKER-STATUS-'.Str::upper(Str::random(12)),
            'reporterId' => 'worker-status-test',
            'title' => 'Temporary worker status feature test',
            'description' => 'Temporary document used only by WorkerReportStatusUpdateTest.',
            'category' => 'Other',
            'location' => 'Automated worker status test fixture',
            'priority' => 'low',
            'status' => $status,
            'assignedWorkerId' => $workerId,
        ]);
    }

    /** @param array<User|null> $workers */
    private function deleteFixtures(?Report $report, array $workers): void
    {
        if ($report !== null) {
            Report::whereKey($report->getKey())->delete();
        }

        foreach ($workers as $worker) {
            if ($worker !== null) {
                User::whereKey($worker->getKey())->delete();
            }
        }
    }
}
