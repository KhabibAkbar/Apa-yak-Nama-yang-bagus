<?php

use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/reports', [ReportController::class, 'index'])->name('api.reports.index');
Route::post('/reports', [ReportController::class, 'store'])->name('api.reports.store');
Route::patch('/reports/{id}/status', [ReportController::class, 'updateStatus'])->name('api.reports.update-status');
Route::patch('/reports/{id}/assign', [ReportController::class, 'assign'])->name('api.reports.assign');
Route::get('/reports/{id}/work-logs', [ReportController::class, 'workLogs'])->name('api.reports.work-logs');
Route::post('/reports/{id}/work-logs', [ReportController::class, 'storeWorkLog'])->name('api.reports.work-logs.store');
Route::post('/reports/{id}/proof', [ReportController::class, 'storeProof'])->name('api.reports.proof.store');
Route::get('/reports/{id}', [ReportController::class, 'show'])->name('api.reports.show');
Route::get('/users', [UserController::class, 'index'])->name('api.users.index');
Route::get('/workers', [UserController::class, 'workers'])->name('api.workers.index');
