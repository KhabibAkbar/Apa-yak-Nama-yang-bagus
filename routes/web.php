<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PageController;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::get('/login', fn () => app(PageController::class)->show('Choose a demo account'))
    ->name('login');
Route::get('/dashboard', fn () => app(PageController::class)->show('Dashboard'))
    ->name('dashboard');
Route::get('/reports', fn () => app(PageController::class)->show('My reports'))
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
Route::get('/worker/tasks', fn () => app(PageController::class)->show('Assigned tasks'))
    ->name('worker.tasks.index');
Route::get('/worker/tasks/{report}', fn (string $report) => app(PageController::class)->show('Task details'))
    ->name('worker.tasks.show');
