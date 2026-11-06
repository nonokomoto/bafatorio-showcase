import { lazy } from 'react';
import { WIP_COMPONENTS } from '../../../Utils/devStages';

// Eager imports — native, tiny renderers
import MarkdownRenderer from './MarkdownRenderer';
import ImageRenderer from './ImageRenderer';
import TextRenderer from './TextRenderer';
import UnsupportedRenderer from './UnsupportedRenderer';

// Heavy renderers — loaded on demand
const PdfRenderer = lazy(() => import('./PdfRenderer'));
const CsvRenderer = lazy(() => import('./CsvRenderer'));
const DocxRenderer = lazy(() => import('./DocxRenderer'));
const SpreadsheetRenderer = lazy(() => import('./SpreadsheetRenderer'));

// Extension → renderer mapping
const RENDERER_MAP = {
  md: MarkdownRenderer,
  jpg: ImageRenderer,
  jpeg: ImageRenderer,
  png: ImageRenderer,
  gif: ImageRenderer,
  txt: TextRenderer,
  pdf: PdfRenderer,
  csv: CsvRenderer,
  docx: DocxRenderer,
  xlsx: SpreadsheetRenderer,
};

// Extension → modal size
const SIZE_MAP = {
  md: '3xl',
  txt: '3xl',
  csv: '3xl',
  jpg: '5xl',
  jpeg: '5xl',
  png: '5xl',
  gif: '5xl',
  pdf: '5xl',
  docx: '5xl',
  xlsx: '5xl',
};

// Extensions that support "Save as PDF" action
const SAVE_AS_PDF_EXTENSIONS = new Set(['md']);

export function getRenderer(extension) {
  // WIP-gated renderers (Phase 2 & 3)
  if (extension === 'pdf' && WIP_COMPONENTS.DOCUMENT_PREVIEW_PDF) {
    return UnsupportedRenderer;
  }
  if (['csv', 'docx', 'xlsx'].includes(extension) && WIP_COMPONENTS.DOCUMENT_PREVIEW_OFFICE) {
    return UnsupportedRenderer;
  }
  return RENDERER_MAP[extension] || UnsupportedRenderer;
}

export function getModalSize(extension) {
  return SIZE_MAP[extension] || 'md';
}

export function supportsSaveAsPdf(extension) {
  return SAVE_AS_PDF_EXTENSIONS.has(extension);
}
