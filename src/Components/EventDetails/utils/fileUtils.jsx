import { FiFile } from 'react-icons/fi';
import {
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaFileExcel,
  FaFileWord,
  FaFilePowerpoint,
  FaFileCsv,
  FaFile,
} from 'react-icons/fa';

// File-type color mapping — drives icon badge, extension pill, and top accent
export const FILE_TYPE_COLORS = {
  pdf: '#EF4444',
  doc: '#3B82F6',
  docx: '#3B82F6',
  xls: '#10B981',
  xlsx: '#10B981',
  csv: '#10B981',
  ppt: '#F97316',
  pptx: '#F97316',
  txt: '#6B7280',
  md: '#6B7280',
  jpg: '#8B5CF6',
  jpeg: '#8B5CF6',
  png: '#8B5CF6',
  gif: '#8B5CF6',
};
export const DEFAULT_FILE_COLOR = '#4069FF';


// File-type specific icons
const FILE_TYPE_ICONS = {
  pdf: FaFilePdf,
  doc: FaFileWord,
  docx: FaFileWord,
  xls: FaFileExcel,
  xlsx: FaFileExcel,
  csv: FaFileCsv,
  ppt: FaFilePowerpoint,
  pptx: FaFilePowerpoint,
  txt: FaFileAlt,
  md: FaFileAlt,
  jpg: FaFileImage,
  jpeg: FaFileImage,
  png: FaFileImage,
  gif: FaFileImage,
};

export const getFileExtension = (fileName) =>
  fileName?.split('.').pop()?.toLowerCase() || '';

export const getFileIcon = (fileName, size = 'sm') => {
  const extension = getFileExtension(fileName);
  const sizeClass = size === 'lg' ? 'w-8 h-8' : '';
  const typeColor = FILE_TYPE_COLORS[extension] || DEFAULT_FILE_COLOR;
  return <FiFile className={`opacity-80 ${sizeClass}`} style={{ color: typeColor }} />;
};

export const getFileTypeIcon = (extension, size = 20) => {
  const IconComponent = FILE_TYPE_ICONS[extension] || FaFile;
  const color = FILE_TYPE_COLORS[extension] || DEFAULT_FILE_COLOR;
  return <IconComponent size={size} style={{ color }} />;
};
