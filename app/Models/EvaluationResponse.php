<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationResponse extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'evaluation_id',
        'question_number',
        'rating',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }
}
