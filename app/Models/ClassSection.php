<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ClassSection extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'subject_id',
        'faculty_id',
        'section_id',
        'school_year',
        'term',
    ];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentSectionEnrollment::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    public function reportSignoff(): HasOne
    {
        return $this->hasOne(EvaluationReportSignoff::class);
    }
}
