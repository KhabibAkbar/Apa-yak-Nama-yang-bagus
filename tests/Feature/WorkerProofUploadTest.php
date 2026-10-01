<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkerProofUploadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'mongodb']);
        DB::setDefaultConnection('mongodb');
        DB::purge('mongodb');
        Storage::fake('public');
    }

    public function test_assigned_worker_can_upload_and_persist_image_proof(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $response = $this->postProof(
                $report,
                (string) $worker->getKey(),
                UploadedFile::fake()->image('completion-proof.png'),
            );

            $response
                ->assertCreated()
                ->assertJsonPath('reportId', (string) $report->getKey())
                ->assertJsonPath('workerId', (string) $worker->getKey())
                ->assertJsonPath('status', 'in_progress');

            $proofPath = $response->json('afterImage');
            $this->assertIsString($proofPath);
            $this->assertStringStartsWith('report-proofs/', $proofPath);
            Storage::disk('public')->assertExists($proofPath);
            $this->assertNotNull(WorkLog::where('reportId', (string) $report->getKey())
                ->where('workerId', (string) $worker->getKey())
                ->where('afterImage', $proofPath)
                ->first());
            $this->assertSame('in_progress', Report::find($report->getKey())?->status);
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_another_worker_cannot_upload_proof(): void
    {
        $assignedWorker = null;
        $requestingWorker = null;
        $report = null;

        try {
            $assignedWorker = $this->createUser('worker');
            $requestingWorker = $this->createUser('worker');
            $report = $this->createReport((string) $assignedWorker->getKey(), 'in_progress');

            $this->postProof($report, (string) $requestingWorker->getKey())
                ->assertForbidden();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, [$assignedWorker, $requestingWorker]);
        }
    }

    public function test_worker_cannot_upload_proof_for_an_unassigned_report(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport(null, 'reported');

            $this->postProof($report, (string) $worker->getKey())->assertForbidden();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_nonexistent_worker_cannot_upload_proof(): void
    {
        $workerId = bin2hex(random_bytes(12));
        $report = null;

        try {
            $report = $this->createReport($workerId, 'in_progress');

            $this->postProof($report, $workerId)->assertNotFound();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, []);
        }
    }

    public function test_non_worker_account_cannot_upload_proof(): void
    {
        $managementUser = null;
        $report = null;

        try {
            $managementUser = $this->createUser('management');
            $report = $this->createReport((string) $managementUser->getKey(), 'in_progress');

            $this->postProof($report, (string) $managementUser->getKey())
                ->assertForbidden();
            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, [$managementUser]);
        }
    }

    public function test_invalid_file_type_is_rejected(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $this->postProof(
                $report,
                (string) $worker->getKey(),
                UploadedFile::fake()->create('notes.txt', 20, 'text/plain'),
            )->assertUnprocessable();

            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_oversized_proof_is_rejected(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $this->postProof(
                $report,
                (string) $worker->getKey(),
                UploadedFile::fake()->image('large-proof.jpg')->size(5121),
            )->assertUnprocessable();

            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    public function test_nonexistent_report_is_rejected_for_proof_upload(): void
    {
        $worker = null;

        try {
            $worker = $this->createUser('worker');

            $this->postJson('/api/reports/000000000000000000000000/proof', [
                'worker_id' => (string) $worker->getKey(),
            ])->assertNotFound();
        } finally {
            $this->deleteFixtures(null, [$worker]);
        }
    }

    public function test_worker_id_is_required_for_proof_upload(): void
    {
        $worker = null;
        $report = null;

        try {
            $worker = $this->createUser('worker');
            $report = $this->createReport((string) $worker->getKey(), 'in_progress');

            $this->post("/api/reports/{$report->getKey()}/proof", [
                'proof' => UploadedFile::fake()->image('missing-worker.png'),
            ], ['Accept' => 'application/json'])->assertUnprocessable();

            $this->assertSame(0, WorkLog::where('reportId', (string) $report->getKey())->count());
            $this->assertSame([], Storage::disk('public')->allFiles('report-proofs'));
        } finally {
            $this->deleteFixtures($report, [$worker]);
        }
    }

    private function postProof(
        Report $report,
        string $workerId,
        ?UploadedFile $proof = null,
    ) {
        return $this->post("/api/reports/{$report->getKey()}/proof", [
            'worker_id' => $workerId,
            'proof' => $proof ?? UploadedFile::fake()->image('completion-proof.png'),
        ], ['Accept' => 'application/json']);
    }

    private function createUser(string $role): User
    {
        return User::create([
            'name' => 'Temporary proof '.Str::random(8),
            'role' => $role,
            'department' => 'Automated test fixture',
            'avatar' => null,
        ]);
    }

    private function createReport(?string $workerId, string $status): Report
    {
        return Report::create([
            'reportCode' => 'CF-PROOF-'.Str::upper(Str::random(12)),
            'reporterId' => 'worker-proof-test',
            'title' => 'Temporary Worker proof test report',
            'description' => 'Temporary document used only by WorkerProofUploadTest.',
            'category' => 'Other',
            'location' => 'Automated proof test fixture',
            'priority' => 'low',
            'status' => $status,
            'assignedWorkerId' => $workerId,
        ]);
    }

    /** @param array<User|null> $workers */
    private function deleteFixtures(?Report $report, array $workers): void
    {
        if ($report !== null) {
            Storage::disk('public')->deleteDirectory(
                'report-proofs/'.(string) $report->getKey(),
            );
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
