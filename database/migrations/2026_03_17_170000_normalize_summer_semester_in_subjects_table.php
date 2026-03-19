<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('subjects') || ! DB::getSchemaBuilder()->hasColumn('subjects', 'semester_offered')) {
            return;
        }

        DB::transaction(function (): void {
            $subjects = DB::table('subjects')
                ->select('id', 'code', 'program', 'curriculum_version', 'semester_offered', 'updated_at')
                ->whereNotNull('semester_offered')
                ->orderBy('id')
                ->get();

            $normalized = $subjects
                ->map(function (object $subject): array {
                    $semester = $this->normalizeSemester((string) $subject->semester_offered);

                    return [
                        'id' => (int) $subject->id,
                        'code' => (string) $subject->code,
                        'program' => (string) ($subject->program ?? ''),
                        'curriculum_version' => (string) ($subject->curriculum_version ?? ''),
                        'semester_offered' => (string) $subject->semester_offered,
                        'normalized_semester' => $semester,
                        'updated_at' => $subject->updated_at,
                    ];
                })
                ->filter(static fn (array $subject): bool => $subject['normalized_semester'] === 'Summer');

            if ($normalized->isEmpty()) {
                return;
            }

            $groups = $normalized->groupBy(static fn (array $subject): string => implode('|', [
                $subject['code'],
                'Summer',
                $subject['program'],
                $subject['curriculum_version'],
            ]));

            $idsToDelete = [];
            $idsToUpdate = [];

            /** @var Collection<int, array<string, mixed>> $group */
            foreach ($groups as $group) {
                $keeper = $group
                    ->sortByDesc(static fn (array $subject): string => implode('|', [
                        $subject['semester_offered'] === 'Summer' ? '1' : '0',
                        (string) ($subject['updated_at'] ?? ''),
                        str_pad((string) $subject['id'], 10, '0', STR_PAD_LEFT),
                    ]))
                    ->first();

                if ($keeper === null) {
                    continue;
                }

                foreach ($group as $subject) {
                    if ($subject['id'] === $keeper['id']) {
                        if ($subject['semester_offered'] !== 'Summer') {
                            $idsToUpdate[] = $subject['id'];
                        }

                        continue;
                    }

                    $idsToDelete[] = $subject['id'];
                }
            }

            if ($idsToDelete !== []) {
                DB::table('subjects')->whereIn('id', array_values(array_unique($idsToDelete)))->delete();
            }

            if ($idsToUpdate !== []) {
                DB::table('subjects')
                    ->whereIn('id', array_values(array_unique($idsToUpdate)))
                    ->update(['semester_offered' => 'Summer']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('subjects') || ! DB::getSchemaBuilder()->hasColumn('subjects', 'semester_offered')) {
            return;
        }

        DB::table('subjects')
            ->where('semester_offered', 'Summer')
            ->update(['semester_offered' => 'Summer Semester']);
    }

    private function normalizeSemester(string $semester): ?string
    {
        $normalized = Str::of($semester)
            ->trim()
            ->lower()
            ->replaceMatches('/\s+/', ' ')
            ->value();

        return match ($normalized) {
            'summer', 'summer semester', 'midyear', 'midyear semester' => 'Summer',
            default => null,
        };
    }
};
