<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExportDocumentTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'header_html',
        'footer_html',
        'header_text',
        'footer_text',
        'source_filename',
        'updated_by',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1]);
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
