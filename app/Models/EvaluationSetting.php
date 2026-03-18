<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'is_open',
        'opened_at',
        'closed_at',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_open' => 'boolean',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1], ['is_open' => false]);
    }

    public static function isOpen(): bool
    {
        return static::current()->is_open;
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
