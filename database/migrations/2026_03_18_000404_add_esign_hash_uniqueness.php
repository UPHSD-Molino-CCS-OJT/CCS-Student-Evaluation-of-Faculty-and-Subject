<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('esign_image_hash', 64)->nullable()->after('esign_image_data_uri');
            $table->unique(['role', 'esign_image_hash'], 'users_role_esign_image_hash_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_role_esign_image_hash_unique');
            $table->dropColumn('esign_image_hash');
        });
    }
};