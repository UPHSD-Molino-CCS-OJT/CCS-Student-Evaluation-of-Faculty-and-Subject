<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'title',
        'semester_offered',
        'program',
        'curriculum_version',
    ];

    public function classSections(): HasMany
    {
        return $this->hasMany(ClassSection::class);
    }
}
