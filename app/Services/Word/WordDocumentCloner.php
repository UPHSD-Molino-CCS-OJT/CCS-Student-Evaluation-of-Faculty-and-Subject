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
    private const WORD_RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/relationships';
    private const WORD_IMAGE_RELATIONSHIP_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';

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
        $this->cloneWithBodyXmlAndMedia($inputDocxPath, $outputDocxPath, $newBodyXmlFragment, []);
    }

    /**
     * Clone an existing DOCX, replace body XML, and embed additional media.
     *
     * @param  array<string, array{bytes:string,extension:string,mimeType:string}>  $mediaByToken
     */
    public function cloneWithBodyXmlAndMedia(string $inputDocxPath, string $outputDocxPath, string $newBodyXmlFragment, array $mediaByToken): void
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

            $documentRelsXml = $sourceZip->getFromName('word/_rels/document.xml.rels');
            if ($documentRelsXml === false || trim($documentRelsXml) === '') {
                throw new RuntimeException('The input DOCX is missing word/_rels/document.xml.rels.');
            }

            $existingEntryNames = [];
            for ($index = 0; $index < $sourceZip->numFiles; $index++) {
                $entryName = $sourceZip->getNameIndex($index);
                if ($entryName !== false) {
                    $existingEntryNames[$entryName] = true;
                }
            }

            [$bodyXmlWithMedia, $updatedRelsXml, $mediaEntries] = $this->prepareBodyXmlWithEmbeddedMedia(
                $newBodyXmlFragment,
                $documentRelsXml,
                $mediaByToken,
                $existingEntryNames,
            );

            $updatedDocumentXml = $this->replaceBodyXmlPreservingSectionProperties($documentXml, $bodyXmlWithMedia);

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

                    if ($entryName === 'word/_rels/document.xml.rels') {
                        $destinationZip->addFromString($entryName, $updatedRelsXml);
                        continue;
                    }

                    $entryBytes = $sourceZip->getFromIndex($index);
                    if ($entryBytes === false) {
                        throw new RuntimeException('Failed to read archive entry: '.$entryName);
                    }

                    $destinationZip->addFromString($entryName, $entryBytes);
                }

                foreach ($mediaEntries as $mediaEntry) {
                    $destinationZip->addFromString($mediaEntry['path'], $mediaEntry['bytes']);
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

    /**
     * @param  array<string, array{bytes:string,extension:string,mimeType:string}>  $mediaByToken
     * @param  array<string, bool>  $existingEntryNames
     * @return array{0:string,1:string,2:array<int, array{path:string,bytes:string,mimeType:string}>}
     */
    private function prepareBodyXmlWithEmbeddedMedia(string $bodyXmlFragment, string $documentRelsXml, array $mediaByToken, array $existingEntryNames): array
    {
        if ($mediaByToken === []) {
            return [$bodyXmlFragment, $documentRelsXml, []];
        }

        $mediaEntries = [];
        $rIdByToken = $this->appendDocumentImageRelationships($documentRelsXml, $mediaByToken, $existingEntryNames, $mediaEntries);

        foreach ($rIdByToken as $token => $relationshipId) {
            $bodyXmlFragment = str_replace($token, $this->buildWordDrawingXml($relationshipId), $bodyXmlFragment);
        }

        return [$bodyXmlFragment, $documentRelsXml, $mediaEntries];
    }

    /**
     * @param  array<string, array{bytes:string,extension:string,mimeType:string}>  $mediaByToken
     * @param  array<string, bool>  $existingEntryNames
     * @param  array<int, array{path:string,bytes:string,mimeType:string}>  $mediaEntries
     * @return array<string, string>
     */
    private function appendDocumentImageRelationships(string &$documentRelsXml, array $mediaByToken, array &$existingEntryNames, array &$mediaEntries): array
    {
        $document = new DOMDocument('1.0', 'UTF-8');
        $document->preserveWhiteSpace = false;
        $document->formatOutput = false;

        $loaded = $document->loadXML($documentRelsXml, LIBXML_NONET);
        if (! $loaded) {
            throw new RuntimeException('Unable to parse word/_rels/document.xml.rels.');
        }

        $root = $document->documentElement;
        if ($root === null) {
            throw new RuntimeException('The DOCX relationships XML has no root element.');
        }

        $nextRelationshipId = $this->nextRelationshipIdNumber($documentRelsXml);
        $tokenRelationshipMap = [];

        foreach ($mediaByToken as $token => $media) {
            $extension = strtolower(trim($media['extension']));
            if ($extension === '') {
                $extension = 'png';
            }

            $baseName = 'signature-'.substr(sha1($token.'-'.$media['bytes']), 0, 12);
            $relativePath = 'media/'.$baseName.'.'.$extension;
            $fullPath = 'word/'.$relativePath;
            $suffix = 1;

            while (isset($existingEntryNames[$fullPath])) {
                $relativePath = 'media/'.$baseName.'-'.$suffix.'.'.$extension;
                $fullPath = 'word/'.$relativePath;
                $suffix++;
            }

            $existingEntryNames[$fullPath] = true;

            $relationshipId = 'rId'.$nextRelationshipId;
            $nextRelationshipId++;

            $relationshipNode = $document->createElementNS(self::WORD_RELATIONSHIPS_NAMESPACE, 'Relationship');
            $relationshipNode->setAttribute('Id', $relationshipId);
            $relationshipNode->setAttribute('Type', self::WORD_IMAGE_RELATIONSHIP_TYPE);
            $relationshipNode->setAttribute('Target', $relativePath);
            $root->appendChild($relationshipNode);

            $tokenRelationshipMap[$token] = $relationshipId;
            $mediaEntries[] = [
                'path' => $fullPath,
                'bytes' => $media['bytes'],
                'mimeType' => $media['mimeType'],
            ];
        }

        $serialized = $document->saveXML();
        if ($serialized === false) {
            throw new RuntimeException('Failed to serialize updated document relationships XML.');
        }

        $documentRelsXml = $serialized;

        return $tokenRelationshipMap;
    }

    private function nextRelationshipIdNumber(string $relsXml): int
    {
        preg_match_all('/Id="rId(\d+)"/i', $relsXml, $matches);
        $existing = $matches[1] ?? [];

        if ($existing === []) {
            return 1;
        }

        $max = 0;
        foreach ($existing as $id) {
            $value = (int) $id;
            if ($value > $max) {
                $max = $value;
            }
        }

        return $max + 1;
    }

    private function buildWordDrawingXml(string $relationshipId): string
    {
        return '<w:r><w:drawing>'
            .'<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            .'<wp:extent cx="1800000" cy="540000"/>'
            .'<wp:effectExtent l="0" t="0" r="0" b="0"/>'
            .'<wp:docPr id="1" name="Signature"/>'
            .'<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></wp:cNvGraphicFramePr>'
            .'<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            .'<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            .'<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            .'<pic:nvPicPr><pic:cNvPr id="0" name="Signature"/><pic:cNvPicPr/></pic:nvPicPr>'
            .'<pic:blipFill><a:blip r:embed="'.$relationshipId.'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            .'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1800000" cy="540000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            .'</pic:pic>'
            .'</a:graphicData>'
            .'</a:graphic>'
            .'</wp:inline>'
            .'</w:drawing></w:r>';
    }
}
