<?php

namespace Tests\Feature;

use App\Models\Report;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReportIndexAssignedWorkerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // PHPUnit defaults to SQLite, but Report uses the configured MongoDB connection.
        config(['database.default' => 'mongodb']);
        DB::setDefaultConnection('mongodb');
        DB::purge('mongodb');
    }

    public function test_index_can_filter_by_assigned_worker_without_changing_unfiltered_results(): void
    {
        $requestedWorkerId = bin2hex(random_bytes(12));
        $otherWorkerId = bin2hex(random_bytes(12));
        $reports = [];

        try {
            $reports[] = $this->createTemporaryReport($requestedWorkerId, 'target');
            $reports[] = $this->createTemporaryReport($otherWorkerId, 'other');
            $reports[] = $this->createTemporaryReport(null, 'unassigned');

            $filtered = $this->getJson('/api/reports?assigned_worker_id='.$requestedWorkerId)
                ->assertOk();

            $filteredIds = collect($filtered->json())->pluck('id')->all();
            $this->assertSame([(string) $reports[0]->getKey()], $filteredIds);

            $unfiltered = $this->getJson('/api/reports')->assertOk();
            $unfilteredIds = collect($unfiltered->json())->pluck('id')->all();

            foreach ($reports as $report) {
                $this->assertContains((string) $report->getKey(), $unfilteredIds);
            }
        } finally {
            foreach ($reports as $report) {
                Report::whereKey($report->getKey())->delete();
            }
        }
    }

    public function test_assigned_worker_id_must_match_a_mongodb_id_string(): void
    {
        $this->getJson('/api/reports?assigned_worker_id=not-a-mongodb-id')
            ->assertUnprocessable();
    }

    private function createTemporaryReport(?string $workerId, string $kind): Report
    {
        return Report::create([
            'reportCode' => 'CF-WORKER-FILTER-'.Str::upper(Str::random(12)),
            'reporterId' => 'worker-filter-test',
            'title' => "Temporary {$kind} worker filter report",
            'description' => 'Temporary document used only by ReportIndexAssignedWorkerTest.',
            'category' => 'Other',
            'location' => 'Automated worker filter test fixture',
            'priority' => 'low',
            'status' => $workerId === null ? 'reported' : 'assigned',
            'assignedWorkerId' => $workerId,
        ]);
    }
}
