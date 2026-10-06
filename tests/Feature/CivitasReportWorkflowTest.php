<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\TestCase;

class CivitasReportWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'mongodb']);
        DB::setDefaultConnection('mongodb');
        DB::purge('mongodb');
        Storage::fake('public');
    }

    public function test_valid_civitas_report_can_be_created_with_reported_status(): void
    {
        $reporter = $this->createCivitas();
        $title = 'Temporary Civitas workflow report '.Str::random(12);

        try {
            $response = $this->postJson('/api/reports', [
                'reporterId' => (string) $reporter->getKey(),
                'title' => $title,
                'description' => 'Temporary document used only by CivitasReportWorkflowTest.',
                'category' => 'Other',
                'location' => 'Civitas workflow test fixture',
                'priority' => 'low',
            ]);

            $response->assertCreated()
                ->assertJsonPath('reporterId', (string) $reporter->getKey())
                ->assertJsonPath('status', 'reported');

            $reportId = $response->json('id');
            $this->assertIsString($reportId);
            $this->assertMatchesRegularExpression('/^CF-[A-Z0-9]{6}$/', $response->json('reportCode'));

            $this->assertSame('reported', Report::find($reportId)?->status);
            $this->assertNull(Report::find($reportId)?->image);
            $response->assertJsonPath('image', null);
        } finally {
            Report::where('title', $title)->delete();
            User::whereKey($reporter->getKey())->delete();
        }
    }

    public function test_civitas_report_can_be_created_with_an_optional_photo(): void
    {
        $reporter = $this->createCivitas();
        $title = 'Temporary Civitas photo report '.Str::random(12);
        $imagePath = null;

        try {
            $response = $this->post('/api/reports', [
                'reporterId' => (string) $reporter->getKey(),
                'title' => $title,
                'description' => 'Temporary photo upload fixture.',
                'category' => 'Other',
                'location' => 'Civitas photo test fixture',
                'priority' => 'low',
                'image' => UploadedFile::fake()->image('campus-condition.jpg'),
            ], ['Accept' => 'application/json']);

            $response->assertCreated()->assertJsonPath('status', 'reported');
            $imagePath = $response->json('image');
            $this->assertIsString($imagePath);
            $this->assertStringStartsWith('reports/', $imagePath);
            Storage::disk('public')->assertExists($imagePath);
            $this->assertSame($imagePath, Report::find($response->json('id'))?->image);

            $this->getJson('/api/reports/'.$response->json('id'))
                ->assertOk()
                ->assertJsonPath('image', $imagePath);
        } finally {
            if (is_string($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }
            Report::where('title', $title)->delete();
            User::whereKey($reporter->getKey())->delete();
        }
    }

    public function test_non_image_file_is_rejected_for_civitas_report_photo(): void
    {
        $reporter = $this->createCivitas();
        $title = 'Temporary Civitas invalid photo report '.Str::random(12);

        try {
            $this->post('/api/reports', [
                'reporterId' => (string) $reporter->getKey(),
                'title' => $title,
                'description' => 'Temporary invalid photo fixture.',
                'category' => 'Other',
                'location' => 'Civitas invalid photo test fixture',
                'priority' => 'low',
                'image' => UploadedFile::fake()->create('notes.txt', 20, 'text/plain'),
            ], ['Accept' => 'application/json'])->assertUnprocessable();

            $this->assertNull(Report::where('title', $title)->first());
            $this->assertSame([], Storage::disk('public')->allFiles('reports'));
        } finally {
            Report::where('title', $title)->delete();
            User::whereKey($reporter->getKey())->delete();
        }
    }

    public function test_reporter_filter_returns_only_the_requested_reporters_reports(): void
    {
        $reporter = $this->createCivitas();
        $otherReporter = $this->createCivitas();
        $reports = [];

        try {
            $reports[] = $this->createReport((string) $reporter->getKey(), 'Requested reporter fixture');
            $reports[] = $this->createReport((string) $otherReporter->getKey(), 'Other reporter fixture');

            $response = $this->getJson('/api/reports?reporterId='.(string) $reporter->getKey())
                ->assertOk();

            $returnedIds = collect($response->json())->pluck('id')->all();
            $this->assertContains((string) $reports[0]->getKey(), $returnedIds);
            $this->assertNotContains((string) $reports[1]->getKey(), $returnedIds);
        } finally {
            foreach ($reports as $report) {
                Report::whereKey($report->getKey())->delete();
            }
            User::whereKey($reporter->getKey())->delete();
            User::whereKey($otherReporter->getKey())->delete();
        }
    }

    public function test_report_detail_and_work_logs_can_be_retrieved(): void
    {
        $report = $this->createReport('civitas-workflow-detail-test', 'Civitas report detail fixture');

        try {
            $workLog = WorkLog::create([
                'reportId' => (string) $report->getKey(),
                'workerId' => 'civitas-workflow-worker-test',
                'status' => 'in_progress',
                'note' => 'Temporary work history fixture.',
            ]);

            $this->getJson('/api/reports/'.(string) $report->getKey())
                ->assertOk()
                ->assertJsonPath('id', (string) $report->getKey())
                ->assertJsonPath('title', 'Civitas report detail fixture');

            $this->getJson('/api/reports/'.(string) $report->getKey().'/work-logs')
                ->assertOk()
                ->assertJsonPath('0.id', (string) $workLog->getKey())
                ->assertJsonPath('0.reportId', (string) $report->getKey());
        } finally {
            WorkLog::where('reportId', (string) $report->getKey())->delete();
            Report::whereKey($report->getKey())->delete();
        }
    }

    private function createCivitas(): User
    {
        return User::create([
            'name' => 'Temporary Civitas '.Str::random(10),
            'role' => 'civitas',
            'department' => 'Civitas',
        ]);
    }

    private function createReport(string $reporterId, string $title): Report
    {
        return Report::create([
            'reportCode' => 'CF-CIVITAS-'.Str::upper(Str::random(12)),
            'reporterId' => $reporterId,
            'title' => $title,
            'description' => 'Temporary document used only by CivitasReportWorkflowTest.',
            'category' => 'Other',
            'location' => 'Civitas workflow test fixture',
            'priority' => 'low',
            'status' => 'reported',
        ]);
    }
}
