<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            try {
                Schema::table('subjects', function (Blueprint $table): void {
                    $table->dropUnique('subjects_code_unique');
                });
            } catch (\Throwable) {
                // Ignore missing index in non-MySQL drivers.
            }

            Schema::table('subjects', function (Blueprint $table): void {
                if (! Schema::hasColumn('subjects', 'semester_offered')) {
                    $table->string('semester_offered', 100)->nullable()->after('title');
                }

                if (! Schema::hasColumn('subjects', 'program')) {
                    $table->string('program', 100)->nullable()->after('semester_offered');
                }

                if (! Schema::hasColumn('subjects', 'curriculum_version')) {
                    $table->string('curriculum_version', 100)->nullable()->after('program');
                }
            });

            Schema::table('subjects', function (Blueprint $table): void {
                $table->unique(
                    ['code', 'semester_offered', 'program', 'curriculum_version'],
                    'subjects_import_unique'
                );
            });

            return;
        }

        $legacyCodeUniqueIndexes = DB::select(
            <<<'SQL'
                SELECT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'subjects'
                GROUP BY INDEX_NAME
                HAVING MIN(NON_UNIQUE) = 0
                    AND COUNT(*) = 1
                    AND SUM(CASE WHEN COLUMN_NAME = 'code' THEN 1 ELSE 0 END) = 1
            SQL
        );

        foreach ($legacyCodeUniqueIndexes as $index) {
            DB::statement(sprintf('ALTER TABLE `subjects` DROP INDEX `%s`', $index->INDEX_NAME));
        }

        Schema::table('subjects', function (Blueprint $table) {
            if (! Schema::hasColumn('subjects', 'semester_offered')) {
                $table->string('semester_offered', 100)->nullable()->after('title');
            }

            if (! Schema::hasColumn('subjects', 'program')) {
                $table->string('program', 100)->nullable()->after('semester_offered');
            }

            if (! Schema::hasColumn('subjects', 'curriculum_version')) {
                $table->string('curriculum_version', 100)->nullable()->after('program');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `subjects` MODIFY `semester_offered` VARCHAR(100) NULL');
            DB::statement('ALTER TABLE `subjects` MODIFY `program` VARCHAR(100) NULL');
            DB::statement('ALTER TABLE `subjects` MODIFY `curriculum_version` VARCHAR(100) NULL');
        }

        $importUniqueIndexes = DB::select(
            <<<'SQL'
                SELECT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'subjects'
                GROUP BY INDEX_NAME
                HAVING MIN(NON_UNIQUE) = 0
                    AND COUNT(*) = 4
                    AND SUM(CASE WHEN COLUMN_NAME IN ('code', 'semester_offered', 'program', 'curriculum_version') THEN 1 ELSE 0 END) = 4
            SQL
        );

        if ($importUniqueIndexes === []) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->unique(
                    ['code', 'semester_offered', 'program', 'curriculum_version'],
                    'subjects_import_unique'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            try {
                Schema::table('subjects', function (Blueprint $table): void {
                    $table->dropUnique('subjects_import_unique');
                });
            } catch (\Throwable) {
                // Ignore missing index in non-MySQL drivers.
            }

            Schema::table('subjects', function (Blueprint $table): void {
                $columnsToDrop = [];
                foreach (['semester_offered', 'program', 'curriculum_version'] as $column) {
                    if (Schema::hasColumn('subjects', $column)) {
                        $columnsToDrop[] = $column;
                    }
                }

                if ($columnsToDrop !== []) {
                    $table->dropColumn($columnsToDrop);
                }
            });

            try {
                Schema::table('subjects', function (Blueprint $table): void {
                    $table->unique('code');
                });
            } catch (\Throwable) {
                // Ignore duplicate index creation in non-MySQL drivers.
            }

            return;
        }

        $hasImportUnique = DB::select(
            <<<'SQL'
                SELECT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'subjects'
                    AND INDEX_NAME = 'subjects_import_unique'
                LIMIT 1
            SQL
        );

        Schema::table('subjects', function (Blueprint $table) use ($hasImportUnique): void {
            if ($hasImportUnique !== []) {
                $table->dropUnique('subjects_import_unique');
            }

            $columnsToDrop = [];
            foreach (['semester_offered', 'program', 'curriculum_version'] as $column) {
                if (Schema::hasColumn('subjects', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });

        $legacyCodeUniqueIndexes = DB::select(
            <<<'SQL'
                SELECT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'subjects'
                GROUP BY INDEX_NAME
                HAVING MIN(NON_UNIQUE) = 0
                    AND COUNT(*) = 1
                    AND SUM(CASE WHEN COLUMN_NAME = 'code' THEN 1 ELSE 0 END) = 1
            SQL
        );

        if ($legacyCodeUniqueIndexes === []) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->unique('code');
            });
        }
    }
};
