<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PageController;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::get('/login', fn () => app(PageController::class)->show('Choose a demo account'))
    ->name('login');

Route::get('/dashboard', fn () => Inertia::render('Dashboard'))
    ->name('dashboard');

Route::get('/reports', fn () => Inertia::render('Reports/Index'))
    ->name('reports.index');

Route::get('/reports/create', fn () => Inertia::render('Reports/Create'))
    ->name('reports.create');

Route::get('/reports/{report}', fn (string $report) => Inertia::render('Reports/Show', [
    'reportId' => $report,
]))->name('reports.show');

Route::get('/management', fn () => Inertia::render('Management/Index'))
    ->name('management.dashboard');

Route::get('/management/reports', fn () => Inertia::render('Management/Reports/Index'))
    ->name('management.reports.index');

Route::get('/management/reports/{report}', fn (string $report) => Inertia::render('Management/Reports/Show', [
    'reportId' => $report,
]))
    ->name('management.reports.show');

Route::get('/worker', fn () => app(PageController::class)->show('Worker dashboard'))
    ->name('worker.dashboard');

Route::get('/worker/tasks', fn () => Inertia::render('Worker/Tasks/Index'))
    ->name('worker.tasks.index');

Route::get('/worker/tasks/{report}', fn (string $report) => Inertia::render('Worker/Tasks/Show', [
    'reportId' => $report,
]))
    ->name('worker.tasks.show');
