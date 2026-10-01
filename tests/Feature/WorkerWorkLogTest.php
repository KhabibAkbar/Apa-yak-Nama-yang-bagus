<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkerWorkLogTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'mongodb']);
        DB::setDefaultConnection('mongodb');
        DB::purge('mongodb');
    }

    public function test_assigned_worker_can_create_and_persist_a_work_log(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $response = $this->postJson("/api/reports/{$report->getKey()}/work-logs", [
                'worker_id' => (string) $worker->getKey(),
                'note' => 'Replaced the damaged cable connector.',
            ]);

            $response
                ->assertCreated()
                ->assertJsonPath('reportId', (string) $report->getKey())
                ->assertJsonPath('workerId', (string) $worker->getKey())
                ->assertJsonPath('note', 'Replaced the damaged cable connector.')
                ->assertJsonPath('status', 'in_progress');

            $this->assertNotNull(WorkLog::where('reportId', (string) $report->getKey())
                ->where('workerId', (string) $worker->getKey())
                ->where('note', 'Replaced the damaged cable connector.')
                ->first());
            $this->assertSame('in_progress', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_another_worker_cannot_create_a_work_log(): void
    {
        $assignedWorker = null;
        $requestingWorker = null;
        $report = null;

        try {
            $assignedWorker = $this->createUser('worker');
            $requestingWorker = $this->createUser('worker');
            $report = $this->createReport((string) $assignedWorker->getKey(), 'in_progress');

            $this->postWorkLog($report, (string) $requestingWorker->getKey())
                ->assertForbidden();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
        } finally {
            $this->deleteFixtures($report, [$assignedWorker, $requestingWorker]);
        }
    }

    public function test_worker_cannot_create_a_work_log_for_an_unassigned_report(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport(null, 'reported');

            $this->postWorkLog($report, (string) $worker->getKey())->assertForbidden();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_nonexistent_worker_is_rejected_for_work_log_creation(): void
    {
        $workerId = bin2hex(random_bytes(12));
        $report = null;

        try {
            $report = $this->createReport($workerId, 'in_progress');

            $this->postWorkLog($report, $workerId)->assertNotFound();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
        } finally {
            $this->deleteFixtures($report, []);
        }
    }

    public function test_nonexistent_report_is_rejected_for_work_log_creation(): void
    {
        $worker = null;

        try {
            $worker = $this->createUser('worker');

            $this->postJson('/api/reports/000000000000000000000000/work-logs', [
                'worker_id' => (string) $worker->getKey(),
                'note' => 'Tried a missing report.',
            ])->assertNotFound();
        } finally {
            $this->deleteFixtures(null, [$worker]);
        }
    }

    public function test_empty_work_note_is_rejected(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $this->postJson("/api/reports/{$report->getKey()}/work-logs", [
                'worker_id' => (string) $worker->getKey(),
                'note' => '',
            ])->assertUnprocessable();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_worker_id_is_required_for_work_log_creation(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $this->postJson("/api/reports/{$report->getKey()}/work-logs", [
                'note' => 'Attempt without a Worker context.',
            ])->assertUnprocessable();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_non_worker_account_cannot_create_a_work_log(): void
    {
        $managementUser = null;
        $report = null;

        try {
            $managementUser = $this->createUser('management');
            $report = $this->createReport((string) $managementUser->getKey(), 'in_progress');

            $this->postWorkLog($report, (string) $managementUser->getKey())->assertForbidden();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
        } finally {
            $this->deleteFixtures($report, [$managementUser]);
        }
    }

    private function postWorkLog(Report $report, string $workerId)
    {
        return $this->postJson("/api/reports/{$report->getKey()}/work-logs", [
            'worker_id' => $workerId,
            'note' => 'Temporary work log test note.',
        ]);
    }

    private function createUser(string $role): User
    {
        return User::create([
            'name' => 'Temporary work log '.Str::random(8),
            'role' => $role,
            'department' => 'Automated test fixture',
            'avatar' => null,
        ]);
    }

    private function createReport(?string $workerId, string $status): Report
    {
        return Report::create([
            'reportCode' => 'CF-WORK-LOG-'.Str::upper(Str::random(12)),
            'reporterId' => 'worker-work-log-test',
            'title' => 'Temporary Worker work log test report',
            'description' => 'Temporary document used only by WorkerWorkLogTest.',
            'category' => 'Other',
            'location' => 'Automated work log test fixture',
            'priority' => 'low',
            'status' => $status,
            'assignedWorkerId' => $workerId,
        ]);
    }

    /** @param array<User|null> $workers */
    private function deleteFixtures(?Report $report, array $workers): void
    {
        if ($report !== null) {
            WorkLog::where('reportId', (string) $report->getKey())->delete();
            Report::whereKey($report->getKey())->delete();
        }

        foreach ($workers as $worker) {
            if ($worker !== null) {
                User::whereKey($worker->getKey())->delete();
            }
        }
    }
}
