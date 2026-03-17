<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubjectImportController extends Controller
{
    public function downloadTemplate(): StreamedResponse
    {
        $columns = [
            'semester_offered',
            'subject_code',
            'course_name',
            'program',
            'curriculum_version',
        ];

        $sampleRows = [
            ['1st Semester', 'CCS101', 'Introduction to Computing', 'BSCS', '2023-2024 Curriculum'],
            ['2nd Semester', 'CCS210', 'Data Structures and Algorithms', 'BSCS', '2023-2024 Curriculum'],
        ];

        return response()->streamDownload(function () use ($columns, $sampleRows): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            foreach ($columns as $index => $column) {
                $sheet->setCellValue([$index + 1, 1], $column);
            }

            foreach ($sampleRows as $rowIndex => $rowValues) {
                foreach ($rowValues as $columnIndex => $value) {
                    $sheet->setCellValue([$columnIndex + 1, $rowIndex + 2], $value);
                }
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 'subjects-import-template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt'],
        ]);

        $spreadsheet = IOFactory::load($payload['file']->getRealPath());
        $worksheet = $spreadsheet->getActiveSheet();
        $highestRow = $worksheet->getHighestDataRow();
        $highestColumnIndex = Coordinate::columnIndexFromString($worksheet->getHighestDataColumn());

        if ($highestRow < 2) {
            return back()->with('status', 'No data rows found in the import file.');
        }

        $headerMap = [];
        for ($col = 1; $col <= $highestColumnIndex; $col++) {
            $header = (string) $worksheet->getCell([$col, 1])->getValue();
            $normalized = Str::of($header)->trim()->lower()->replace(' ', '_')->value();
            if ($normalized !== '') {
                $headerMap[$normalized] = $col;
            }
        }

        $requiredColumns = ['semester_offered', 'subject_code', 'course_name', 'program', 'curriculum_version'];
        $missingColumns = array_values(array_diff($requiredColumns, array_keys($headerMap)));

        if ($missingColumns !== []) {
            return back()->withErrors([
                'file' => 'Missing required column(s): '.implode(', ', $missingColumns).'.',
            ]);
        }

        $importRows = [];

        for ($row = 2; $row <= $highestRow; $row++) {
            $item = [];
            foreach ($requiredColumns as $column) {
                $value = (string) $worksheet->getCell([$headerMap[$column], $row])->getFormattedValue();
                $item[$column] = trim($value);
            }

            if (collect($item)->every(static fn (string $value): bool => $value === '')) {
                continue;
            }

            foreach ($requiredColumns as $column) {
                if ($item[$column] === '') {
                    return back()->withErrors([
                        'file' => "Row {$row} is missing '{$column}'.",
                    ]);
                }
            }

            $importRows[] = $item;
        }

        if ($importRows === []) {
            return back()->with('status', 'No valid rows found in the import file.');
        }

        DB::transaction(function () use ($importRows): void {
            foreach ($importRows as $row) {
                Subject::query()->updateOrCreate(
                    [
                        'code' => $row['subject_code'],
                        'semester_offered' => $row['semester_offered'],
                        'program' => $row['program'],
                        'curriculum_version' => $row['curriculum_version'],
                    ],
                    [
                        'title' => $row['course_name'],
                    ]
                );
            }
        });

        return back()->with('status', 'Subjects imported successfully.');
    }
}
