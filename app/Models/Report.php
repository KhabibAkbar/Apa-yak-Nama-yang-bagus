<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Report extends Model
{
    public const CATEGORIES = ['Electrical', 'HVAC', 'Furniture', 'Cleaning', 'Internet', 'Other'];

    public const PRIORITIES = ['low', 'medium', 'high'];

    public const STATUSES = [
        'reported', 'under_review', 'assigned', 'in_progress',
        'waiting_verification', 'resolved', 'reopened',
    ];

    protected $collection = 'reports';

    protected $keyType = 'string';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'reportCode', 'reporterId', 'title', 'description', 'category', 'location',
        'priority', 'status', 'assignedWorkerId', 'image',
    ];

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
