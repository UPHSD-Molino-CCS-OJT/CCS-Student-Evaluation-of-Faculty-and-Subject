<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationReportSignoff extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'class_section_id',
        'faculty_user_id',
        'faculty_signed_at',
        'faculty_signature_path',
        'dean_user_id',
        'dean_signed_at',
        'dean_signature_path',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'faculty_signed_at' => 'datetime',
            'dean_signed_at' => 'datetime',
        ];
    }

    public function classSection(): BelongsTo
    {
        return $this->belongsTo(ClassSection::class);
    }

    public function facultySigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'faculty_user_id');
    }

    public function deanSigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dean_user_id');
    }
}
