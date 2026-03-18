<?php

declare(strict_types=1);

namespace App\Services\Word;

use DOMDocument;
use DOMXPath;
use RuntimeException;
use ZipArchive;

class WordDocumentCloner
{
    private const WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    /**
     * Clone an existing DOCX and replace only the body with plain text.
     *
     * The entire package (headers, footers, media, rels, styles) is copied as-is.
     * Only /word/document.xml is changed, and section properties (w:sectPr)
     * are preserved so header/footer references remain intact.
     */
    public function cloneWithBodyText(string $inputDocxPath, string $outputDocxPath, string $newBodyText): void
    {
        $bodyXml = $this->buildBodyFragmentFromPlainText($newBodyText);
        $this->cloneWithBodyXml($inputDocxPath, $outputDocxPath, $bodyXml);
    }

    /**
     * Clone an existing DOCX and replace only the body with WordprocessingML XML.
     *
     * $newBodyXmlFragment should contain body children like <w:p>...</w:p>
     * (without wrapping <w:body>).
     */
    public function cloneWithBodyXml(string $inputDocxPath, string $outputDocxPath, string $newBodyXmlFragment): void
    {
        $this->assertInputDocxReadable($inputDocxPath);
        $this->ensureOutputDirectoryExists($outputDocxPath);

        $sourceZip = new ZipArchive();
        $openSourceResult = $sourceZip->open($inputDocxPath);

        if ($openSourceResult !== true) {
            throw new RuntimeException('Unable to open input DOCX archive.');
        }

        try {
            $documentXml = $sourceZip->getFromName('word/document.xml');
            if ($documentXml === false || trim($documentXml) === '') {
                throw new RuntimeException('The input DOCX is missing word/document.xml.');
            }

            $updatedDocumentXml = $this->replaceBodyXmlPreservingSectionProperties($documentXml, $newBodyXmlFragment);

            $destinationZip = new ZipArchive();
            $openDestinationResult = $destinationZip->open($outputDocxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

            if ($openDestinationResult !== true) {
                throw new RuntimeException('Unable to create output DOCX archive.');
            }

            try {
                for ($index = 0; $index < $sourceZip->numFiles; $index++) {
                    $entryName = $sourceZip->getNameIndex($index);

                    if ($entryName === false) {
                        continue;
                    }

                    if (str_ends_with($entryName, '/')) {
                        $destinationZip->addEmptyDir(rtrim($entryName, '/'));
                        continue;
                    }

                    if ($entryName === 'word/document.xml') {
                        $destinationZip->addFromString($entryName, $updatedDocumentXml);
                        continue;
                    }

                    $entryBytes = $sourceZip->getFromIndex($index);
                    if ($entryBytes === false) {
                        throw new RuntimeException('Failed to read archive entry: '.$entryName);
                    }

                    $destinationZip->addFromString($entryName, $entryBytes);
                }
            } finally {
                $destinationZip->close();
            }
        } finally {
            $sourceZip->close();
        }
    }

    private function assertInputDocxReadable(string $inputDocxPath): void
    {
        if ($inputDocxPath === '' || ! is_file($inputDocxPath) || ! is_readable($inputDocxPath)) {
            throw new RuntimeException('Input DOCX file is not readable.');
        }

        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('PHP zip extension is not available.');
        }
    }

    private function ensureOutputDirectoryExists(string $outputDocxPath): void
    {
        $directory = dirname($outputDocxPath);

        if ($directory === '' || $directory === '.' || is_dir($directory)) {
            return;
        }

        if (! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create output directory: '.$directory);
        }
    }

    private function replaceBodyXmlPreservingSectionProperties(string $documentXml, string $newBodyXmlFragment): string
    {
        $document = new DOMDocument('1.0', 'UTF-8');
        $document->preserveWhiteSpace = false;
        $document->formatOutput = false;

        $loaded = $document->loadXML($documentXml, LIBXML_NONET);
        if (! $loaded) {
            throw new RuntimeException('Unable to parse word/document.xml from input DOCX.');
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('w', self::WORD_NAMESPACE);

        $bodyNode = $xpath->query('/w:document/w:body')->item(0);
        if ($bodyNode === null) {
            throw new RuntimeException('word/document.xml is missing w:body.');
        }

        $sectionProperties = $xpath->query('./w:sectPr', $bodyNode)->item(0);

        while ($bodyNode->firstChild !== null) {
            $bodyNode->removeChild($bodyNode->firstChild);
        }

        $bodyFragmentRoot = new DOMDocument('1.0', 'UTF-8');
        $wrappedFragment = '<w:fragment xmlns:w="'.self::WORD_NAMESPACE.'">'.$newBodyXmlFragment.'</w:fragment>';

        $fragmentLoaded = $bodyFragmentRoot->loadXML($wrappedFragment, LIBXML_NONET);
        if (! $fragmentLoaded) {
            throw new RuntimeException('The provided body XML fragment is invalid WordprocessingML.');
        }

        foreach ($bodyFragmentRoot->documentElement->childNodes as $fragmentChild) {
            $imported = $document->importNode($fragmentChild, true);
            $bodyNode->appendChild($imported);
        }

        if ($sectionProperties !== null) {
            $bodyNode->appendChild($document->importNode($sectionProperties, true));
        }

        $outputXml = $document->saveXML();
        if ($outputXml === false) {
            throw new RuntimeException('Failed to serialize updated word/document.xml.');
        }

        return $outputXml;
    }

    private function buildBodyFragmentFromPlainText(string $newBodyText): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $newBodyText);
        $lines = explode("\n", $normalized);

        if ($lines === []) {
            return '<w:p/>';
        }

        $paragraphs = [];

        foreach ($lines as $line) {
            $escaped = htmlspecialchars($line, ENT_XML1 | ENT_QUOTES, 'UTF-8');

            if ($escaped === '') {
                $paragraphs[] = '<w:p/>';
                continue;
            }

            $paragraphs[] = '<w:p><w:r><w:t xml:space="preserve">'.$escaped.'</w:t></w:r></w:p>';
        }

        return implode('', $paragraphs);
    }
}
