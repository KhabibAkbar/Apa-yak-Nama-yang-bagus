<?php

namespace Tests\Feature;

use App\Models\Report;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReportStatusUpdateTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // PHPUnit defaults to SQLite, but Report uses the configured MongoDB connection.
        config(['database.default' => 'mongodb']);
        DB::setDefaultConnection('mongodb');
        DB::purge('mongodb');
    }

    public function test_valid_status_updates_and_returns_the_report(): void
    {
        $report = $this->createTemporaryReport();

        try {
            $response = $this->patchJson(
                "/api/reports/{$report->getKey()}/status",
                ['status' => 'under_review'],
            );

            $response
                ->assertOk()
                ->assertJsonPath('id', (string) $report->getKey())
                ->assertJsonPath('status', 'under_review');

            $this->assertSame(
                'under_review',
                Report::find($report->getKey())?->status,
            );
        } finally {
            $this->deleteTemporaryReport($report);
        }
    }

    public function test_invalid_status_is_rejected_without_changing_the_report(): void
    {
        $report = $this->createTemporaryReport();

        try {
            $this->patchJson(
                "/api/reports/{$report->getKey()}/status",
                ['status' => 'invalid_status'],
            )->assertUnprocessable();

            $this->assertSame(
                'reported',
                Report::find($report->getKey())?->status,
            );
        } finally {
            $this->deleteTemporaryReport($report);
        }
    }

    public function test_missing_report_returns_not_found(): void
    {
        $this->patchJson(
            '/api/reports/000000000000000000000000/status',
            ['status' => 'under_review'],
        )->assertNotFound();
    }

    private function createTemporaryReport(): Report
    {
        return Report::create([
            'reportCode' => 'CF-TEST-'.Str::upper(Str::random(12)),
            'reporterId' => 'status-update-test',
            'title' => 'Temporary report status feature test',
            'description' => 'Temporary document used only by ReportStatusUpdateTest.',
            'category' => 'Other',
            'location' => 'Automated test fixture',
            'priority' => 'low',
            'status' => 'reported',
        ]);
    }

    private function deleteTemporaryReport(Report $report): void
    {
        Report::whereKey($report->getKey())->delete();
    }
}
