<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(User::query()->get(['name', 'role', 'department', 'avatar']));
    }

    public function workers(): JsonResponse
    {
        return response()->json(
            User::where('role', 'worker')->get(['name', 'role', 'department', 'avatar']),
        );
    }
}
