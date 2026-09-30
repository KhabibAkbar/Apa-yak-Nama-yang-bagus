<?php

namespace Database\Seeders;

use App\Models\Report;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $demoUsers = [
            ['name' => 'Alya Pratama', 'role' => 'civitas', 'department' => 'Civitas', 'avatar' => null],
            ['name' => 'Bima Santoso', 'role' => 'civitas', 'department' => 'Civitas', 'avatar' => null],
            ['name' => 'Citra Maharani', 'role' => 'civitas', 'department' => 'Civitas', 'avatar' => null],
            ['name' => 'Raka Wijaya', 'role' => 'management', 'department' => 'Facilities Management', 'avatar' => null],
            ['name' => 'Nadia Putri', 'role' => 'management', 'department' => 'Facilities Management', 'avatar' => null],
            ['name' => 'Dimas Saputra', 'role' => 'worker', 'department' => 'Electrical', 'avatar' => null],
            ['name' => 'Sari Wulandari', 'role' => 'worker', 'department' => 'Cleaning', 'avatar' => null],
            ['name' => 'Farhan Akbar', 'role' => 'worker', 'department' => 'Facilities', 'avatar' => null],
            ['name' => 'Putri Lestari', 'role' => 'worker', 'department' => 'HVAC', 'avatar' => null],
        ];

        $users = [];

        foreach ($demoUsers as $attributes) {
            $users[$attributes['name']] = User::updateOrCreate(
                ['name' => $attributes['name'], 'role' => $attributes['role']],
                $attributes,
            );
        }

        $demoReports = [
            [
                'reportCode' => 'CF-DEMO01', 'reporter' => 'Alya Pratama',
                'title' => 'Classroom lights are flickering',
                'description' => 'Three lights flicker during lectures in the back row.',
                'category' => 'Electrical', 'location' => 'Science Building, Room 204',
                'priority' => 'medium', 'status' => 'reported', 'worker' => null,
                'image' => 'placeholders/report-electrical.svg', 'history' => [],
            ],
            [
                'reportCode' => 'CF-2026-002', 'reporter' => 'Bima Santoso',
                'title' => 'Water leaking below the library air conditioner',
                'description' => 'Water is dripping onto the floor under the north-side unit.',
                'category' => 'HVAC', 'location' => 'Central Library, Level 2',
                'priority' => 'high', 'status' => 'under_review', 'worker' => null,
                'image' => 'placeholders/report-leak.svg', 'history' => ['under_review'],
            ],
            [
                'reportCode' => 'CF-2026-003', 'reporter' => 'Citra Maharani',
                'title' => 'Loose chair in lecture hall',
                'description' => 'A chair in the front section has a loose leg and feels unstable.',
                'category' => 'Furniture', 'location' => 'Arts Hall, Seat A-12',
                'priority' => 'medium', 'status' => 'assigned', 'worker' => 'Putri Lestari',
                'image' => null, 'history' => ['assigned'],
            ],
            [
                'reportCode' => 'CF-2026-004', 'reporter' => 'Alya Pratama',
                'title' => 'Projector cannot connect to campus network',
                'description' => 'The room projector is online but cannot reach the campus network.',
                'category' => 'Internet', 'location' => 'Engineering Block, Room 301',
                'priority' => 'high', 'status' => 'in_progress', 'worker' => 'Dimas Saputra',
                'image' => null, 'history' => ['assigned', 'in_progress'],
            ],
            [
                'reportCode' => 'CF-2026-005', 'reporter' => 'Bima Santoso',
                'title' => 'Broken tap in the east washroom',
                'description' => 'The tap handle is loose and water continues to run after closing.',
                'category' => 'Other', 'location' => 'Student Centre, East Washroom',
                'priority' => 'medium', 'status' => 'waiting_verification', 'worker' => 'Farhan Akbar',
                'image' => null, 'history' => ['assigned', 'in_progress', 'waiting_verification'],
            ],
            [
                'reportCode' => 'CF-2026-006', 'reporter' => 'Citra Maharani',
                'title' => 'Overflowing waste bin near study area',
                'description' => 'The recycling and general waste bins have not been cleared today.',
                'category' => 'Cleaning', 'location' => 'Learning Commons, Level 1',
                'priority' => 'low', 'status' => 'resolved', 'worker' => 'Sari Wulandari',
                'image' => null, 'history' => ['assigned', 'in_progress', 'waiting_verification', 'resolved'],
            ],
            [
                'reportCode' => 'CF-2026-007', 'reporter' => 'Alya Pratama',
                'title' => 'Power outlet still trips after repair',
                'description' => 'The outlet trips the breaker again when a laptop is connected.',
                'category' => 'Electrical', 'location' => 'Science Building, Lab 108',
                'priority' => 'high', 'status' => 'reopened', 'worker' => 'Dimas Saputra',
                'image' => null, 'history' => ['assigned', 'in_progress', 'waiting_verification', 'resolved', 'reopened'],
            ],
            [
                'reportCode' => 'CF-2026-008', 'reporter' => 'Bima Santoso',
                'title' => 'Desk drawer is jammed',
                'description' => 'The shared study desk drawer will not open and appears misaligned.',
                'category' => 'Furniture', 'location' => 'Business School, Study Room 12',
                'priority' => 'low', 'status' => 'assigned', 'worker' => 'Farhan Akbar',
                'image' => null, 'history' => ['assigned'],
            ],
            [
                'reportCode' => 'CF-2026-009', 'reporter' => 'Citra Maharani',
                'title' => 'Lecture room is unusually warm',
                'description' => 'The cooling unit runs but the room remains warm during afternoon classes.',
                'category' => 'HVAC', 'location' => 'Humanities Building, Room 220',
                'priority' => 'medium', 'status' => 'in_progress', 'worker' => 'Putri Lestari',
                'image' => null, 'history' => ['assigned', 'in_progress'],
            ],
            [
                'reportCode' => 'CF-2026-010', 'reporter' => 'Alya Pratama',
                'title' => 'Walkway lights outside the gym are out',
                'description' => 'Two fixtures along the covered walkway do not turn on after dusk.',
                'category' => 'Electrical', 'location' => 'Sports Centre, West Walkway',
                'priority' => 'high', 'status' => 'resolved', 'worker' => 'Dimas Saputra',
                'image' => null, 'history' => ['assigned', 'in_progress', 'waiting_verification', 'resolved'],
            ],
        ];

        $reports = [];

        foreach ($demoReports as $attributes) {
            $reporter = $users[$attributes['reporter']];
            $worker = $attributes['worker'] === null ? null : $users[$attributes['worker']];

            $reports[$attributes['reportCode']] = Report::updateOrCreate(
                ['reportCode' => $attributes['reportCode']],
                [
                    'reporterId' => (string) $reporter->getKey(),
                    'title' => $attributes['title'],
                    'description' => $attributes['description'],
                    'category' => $attributes['category'],
                    'location' => $attributes['location'],
                    'priority' => $attributes['priority'],
                    'status' => $attributes['status'],
                    'assignedWorkerId' => $worker === null ? null : (string) $worker->getKey(),
                    'image' => $attributes['image'],
                ],
            );

            $historyNotes = [
                'under_review' => 'Management reviewed the report and confirmed the issue details.',
                'assigned' => 'Task assigned to the facilities worker for follow-up.',
                'in_progress' => 'Worker started the repair and recorded the initial condition.',
                'waiting_verification' => 'Work is complete and proof has been submitted for review.',
                'resolved' => 'Completed work was checked and verified by management.',
                'reopened' => 'The issue persisted after verification; follow-up work is needed.',
            ];

            foreach ($attributes['history'] as $status) {
                WorkLog::updateOrCreate(
                    ['reportId' => (string) $reports[$attributes['reportCode']]->getKey(), 'status' => $status],
                    [
                        'workerId' => $worker === null ? null : (string) $worker->getKey(),
                        'note' => $historyNotes[$status],
                        'beforeImage' => $status === 'in_progress' ? 'placeholders/work-before.svg' : null,
                        'afterImage' => in_array($status, ['waiting_verification', 'resolved'], true)
                            ? 'placeholders/work-after.svg'
                            : null,
                    ],
                );
            }
        }
    }
}
