<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function show(string $title, string $description = 'This CampusFix MVP page is ready for its next implementation step.'): Response
    {
        return Inertia::render('campusfix/page', [
            'title' => $title,
            'description' => $description,
        ]);
    }
}
