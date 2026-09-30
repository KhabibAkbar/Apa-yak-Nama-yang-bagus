<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use MongoDB\Laravel\Auth\User as Authenticatable;

/**
 * @property string $id
 * @property string $name
 * @property string $role
 * @property string|null $department
 * @property string|null $avatar
 */
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    public const ROLES = ['civitas', 'management', 'worker'];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $collection = 'users';

    protected $fillable = ['name', 'role', 'department', 'avatar'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
