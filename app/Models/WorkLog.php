<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class WorkLog extends Model
{
    protected $collection = 'work_logs';

    protected $keyType = 'string';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = null;

    protected $fillable = [
        'reportId', 'workerId', 'status', 'note', 'beforeImage', 'afterImage',
    ];

    protected $casts = ['createdAt' => 'datetime'];
}
