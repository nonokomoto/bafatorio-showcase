import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';

const Skeleton = ({ 
  variant = 'text',
  count = 1,
  className = '',
  height,
  width,
  isLoading = true,
  children
}) => {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  // Predefined variants
  const variants = {
    text: "h-4 rounded-md",
    title: "h-6 rounded-md",
    avatar: "h-10 w-10 rounded-full",
    button: "h-9 w-24 rounded-md",
    card: "h-24 rounded-lg",
    badge: "h-5 w-16 rounded-full",
    image: "rounded-lg"
  };

  // Helper to generate skeleton items
  const renderSkeleton = (index) => {
    const style = {
      height: height || undefined,
      width: width || undefined
    };

    return (
      <div
        key={index}
        className={`${baseClasses} ${variants[variant] || ''} ${className}`}
        style={style}
      />
    );
  };

  // Predefined layouts
  const layouts = {
    // Layout for supplier list items
    supplierListItem: (
      <div className="p-4 flex items-center gap-4">
        <div className={`${baseClasses} h-10 w-10 rounded-full`} /> {/* Avatar */}
        <div className="flex-1 space-y-2">
          <div className={`${baseClasses} h-5 w-48`} /> {/* Name */}
          <div className={`${baseClasses} h-4 w-32`} /> {/* Category */}
        </div>
        <div className={`${baseClasses} h-8 w-24 rounded-md`} /> {/* Action button */}
      </div>
    ),

    // Layout for document list items
    documentListItem: (
      <div className="p-4 flex items-center gap-4">
        <div className={`${baseClasses} h-12 w-12 rounded-lg`} /> {/* Document icon */}
        <div className="flex-1 space-y-2">
          <div className={`${baseClasses} h-5 w-64`} /> {/* Document name */}
          <div className={`${baseClasses} h-4 w-40`} /> {/* Document info */}
        </div>
        <div className="flex gap-2">
          <div className={`${baseClasses} h-8 w-8 rounded-md`} /> {/* Action icon */}
          <div className={`${baseClasses} h-8 w-8 rounded-md`} /> {/* Action icon */}
        </div>
      </div>
    ),

    // Layout for note items
    noteListItem: (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`${baseClasses} h-8 w-8 rounded-full`} /> {/* User avatar */}
          <div className={`${baseClasses} h-5 w-32`} /> {/* Username */}
          <div className={`${baseClasses} h-4 w-24`} /> {/* Date */}
        </div>
        <div className="space-y-2">
          <div className={`${baseClasses} h-4 w-full`} /> {/* Content line 1 */}
          <div className={`${baseClasses} h-4 w-3/4`} /> {/* Content line 2 */}
        </div>
      </div>
    ),

    // Layout for card with header
    card: (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`${baseClasses} h-6 w-48`} /> {/* Title */}
          <div className={`${baseClasses} h-9 w-24 rounded-md`} /> {/* Button */}
        </div>
        <div className="space-y-3">
          <div className={`${baseClasses} h-4 w-full`} />
          <div className={`${baseClasses} h-4 w-5/6`} />
          <div className={`${baseClasses} h-4 w-4/6`} />
        </div>
      </div>
    ),

    // New layout for EventSupplierListItem
    eventSupplierListItem: (
      <div className="odd:bg-card even:bg-card/70">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
          {/* Supplier Name */}
          <div className="flex-1 min-w-0 pr-2">
            <div className={`${baseClasses} h-5 w-48`} />
          </div>
          {/* Category */}
          <div className="hidden lg:flex w-[120px] flex-shrink-0 pr-2">
            <div className={`${baseClasses} h-5 w-20 rounded-full`} />
          </div>
          {/* Quote Amount */}
          <div className="hidden md:flex w-[140px] flex-shrink-0 pr-2">
            <div className={`${baseClasses} h-5 w-24`} />
          </div>
          {/* Status */}
          <div className="hidden md:flex w-[130px] flex-shrink-0 pr-2">
            <div className={`${baseClasses} h-5 w-20 rounded-full`} />
          </div>
          {/* Invoice */}
          <div className="hidden sm:flex w-[150px] flex-shrink-0 pr-2">
            <div className={`${baseClasses} h-8 w-24 rounded-md`} />
          </div>
          {/* Actions */}
          <div className="w-[50px] flex-shrink-0 text-center">
            <div className={`${baseClasses} h-6 w-6 rounded-full mx-auto`} />
          </div>
        </div>
      </div>
    ),

    // New layout for EventSupplierList
    eventSupplierList: (
      <div>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700/50">
          <div className={`${baseClasses} h-6 w-48`} /> {/* Title */}
          <div className={`${baseClasses} h-9 w-32 rounded-md`} /> {/* Add Button */}
        </div>
        {/* List Header */}
        <div className="bg-muted border-b border-border">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className={`${baseClasses} h-4 flex-1 min-w-0 pr-2`} />
            <div className={`${baseClasses} h-4 w-[120px] hidden lg:block`} />
            <div className={`${baseClasses} h-4 w-[140px] hidden md:block`} />
            <div className={`${baseClasses} h-4 w-[130px] hidden md:block`} />
            <div className={`${baseClasses} h-4 w-[150px] hidden sm:block`} />
            <div className={`${baseClasses} h-4 w-[50px]`} />
          </div>
        </div>
        {/* List Items */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="odd:bg-card even:bg-card/70">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0 pr-2">
                  <div className={`${baseClasses} h-5 w-48`} />
                </div>
                <div className="hidden lg:flex w-[120px] flex-shrink-0 pr-2">
                  <div className={`${baseClasses} h-5 w-20 rounded-full`} />
                </div>
                <div className="hidden md:flex w-[140px] flex-shrink-0 pr-2">
                  <div className={`${baseClasses} h-5 w-24`} />
                </div>
                <div className="hidden md:flex w-[130px] flex-shrink-0 pr-2">
                  <div className={`${baseClasses} h-5 w-20 rounded-full`} />
                </div>
                <div className="hidden sm:flex w-[150px] flex-shrink-0 pr-2">
                  <div className={`${baseClasses} h-8 w-24 rounded-md`} />
                </div>
                <div className="w-[50px] flex-shrink-0 text-center">
                  <div className={`${baseClasses} h-6 w-6 rounded-full mx-auto`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    // Layout for participant form
    participantForm: (
      <div className="p-0 md:py-2 animate__animated animate__fadeIn">
        <div className="overflow-hidden relative">
          {/* Header */}
          <div className="p-4 border-b border-background dark:border-gray-500">
            <div className={`${baseClasses} h-6 w-48 mx-auto`} />
          </div>

          {/* Form content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
            <div className="max-w-xl lg:max-w-2xl mx-auto space-y-4">
              {/* Basic fields */}
              <div className="space-y-4">
                {/* Name field */}
                <div className="relative">
                  <div className={`${baseClasses} h-10 rounded-lg`} />
                </div>
                {/* Email field */}
                <div className="relative">
                  <div className={`${baseClasses} h-10 rounded-lg`} />
                </div>
                {/* Phone field */}
                <div className="relative">
                  <div className={`${baseClasses} h-10 rounded-lg`} />
                </div>
                {/* Role select */}
                <div className="relative">
                  <div className={`${baseClasses} h-10 rounded-lg`} />
                </div>
                {/* Status select */}
                <div className="relative">
                  <div className={`${baseClasses} h-10 rounded-lg`} />
                </div>
                {/* Job field */}
                <div className="relative">
                  <div className={`${baseClasses} h-10 rounded-lg`} />
                </div>
                {/* Notes textarea */}
                <div className="relative">
                  <div className={`${baseClasses} h-24 rounded-lg`} />
                </div>
              </div>

              {/* Dependents section */}
              <div className="mt-6 space-y-3">
                <div className={`${baseClasses} h-5 w-48`} /> {/* Question text */}
                <div className="flex space-x-4">
                  <div className={`${baseClasses} h-5 w-20 rounded-full`} /> {/* Radio 1 */}
                  <div className={`${baseClasses} h-5 w-20 rounded-full`} /> {/* Radio 2 */}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-4 mt-6">
                <div className={`${baseClasses} h-10 w-24 rounded-lg`} /> {/* Cancel button */}
                <div className={`${baseClasses} h-10 w-32 rounded-lg`} /> {/* Submit button */}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    // Refined layout for Supplier List
    supplierList: (
      <div>
        {/* Controls Section Placeholder */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className={`${baseClasses} h-9 w-full rounded-md`} /> {/* Search Input */}
            </div>
            <div className="w-full md:w-48">
              <div className={`${baseClasses} h-9 w-full rounded-md`} /> {/* Category Filter */}
            </div>
            <div className="w-full md:w-48">
              <div className={`${baseClasses} h-9 w-full rounded-md`} /> {/* Sort Dropdown */}
            </div>
          </div>
        </div>

        {/* List Header Placeholder */}
        <div className="bg-muted border-b border-border">
            <div className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold">
                <div className={`${baseClasses} h-4 flex-1 min-w-0 pr-2`} />
                <div className={`${baseClasses} h-4 flex-1 min-w-[150px] hidden lg:block`} />
                <div className={`${baseClasses} h-4 w-[180px] hidden lg:block`} />
                <div className={`${baseClasses} h-4 w-[100px] hidden lg:block`} />
                <div className={`${baseClasses} h-4 w-[220px] hidden lg:block`} />
                <div className={`${baseClasses} h-4 w-[110px] hidden lg:block`} />
                <div className={`${baseClasses} h-4 w-[50px]`} />
            </div>
        </div>

        {/* List Items Placeholder */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="odd:bg-card even:bg-card/70">
              <div className="flex items-center gap-3 px-4 py-4"> 
                  {/* Name */}
                  <div className="flex-1 min-w-0 pr-2">
                      <div className={`${baseClasses} h-5 w-3/4 rounded`} />
                  </div>
                  {/* Phone */}
                  <div className="hidden lg:flex flex-1 min-w-[150px] items-center gap-1.5 pr-2">
                      <div className={`${baseClasses} h-4 w-4 rounded-full flex-shrink-0`} /> {/* Icon placeholder */}
                      <div className={`${baseClasses} h-4 w-2/3 rounded`} /> {/* Text placeholder */}
                  </div>
                  {/* Contact */}
                  <div className="hidden lg:flex w-[180px] items-center gap-1.5 flex-shrink-0 pr-2">
                       <div className={`${baseClasses} h-4 w-4 rounded-full flex-shrink-0`} /> {/* Icon placeholder */}
                      <div className={`${baseClasses} h-4 w-1/2 rounded`} /> {/* Text placeholder */}
                  </div>
                  {/* Category */}
                  <div className="hidden lg:flex w-[100px] flex-shrink-0 pr-2">
                       <div className={`${baseClasses} h-5 w-20 rounded-full`} /> {/* Badge placeholder */}
                  </div>
                  {/* Budget */}
                  <div className="hidden lg:flex w-[220px] items-center gap-1.5 flex-shrink-0 pr-2">
                       <div className={`${baseClasses} h-4 w-4 rounded-full flex-shrink-0`} /> {/* Icon placeholder */}
                       <div className={`${baseClasses} h-4 w-2/4 rounded`} /> {/* Text placeholder */}
                  </div>
                  {/* Updated At */}
                  <div className="hidden lg:flex w-[110px] flex-shrink-0 pr-2">
                      <div className={`${baseClasses} h-4 w-1/2 rounded`} /> {/* Text placeholder */}
                  </div>
                  {/* Actions */}
                  <div className="w-[50px] flex-shrink-0 text-center">
                      <div className={`${baseClasses} h-6 w-6 rounded-full mx-auto`} /> {/* Dropdown trigger placeholder */}
                  </div>
              </div>
            </div>
          ))}
        </div>
         {/* Pagination Placeholder */}
         <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
             <div className="flex justify-between items-center">
                 <div className={`${baseClasses} h-8 w-24 rounded-md`} />
                 <div className={`${baseClasses} h-4 w-32 rounded`} />
                 <div className={`${baseClasses} h-8 w-24 rounded-md`} />
             </div>
         </div>
      </div>
    ),

    // Layout for Document List Component
    documentList: (
      <div>
        {/* Header Placeholder */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-7">
          <div className="flex items-center">
            <div className={`${baseClasses} h-6 w-48 rounded`} /> {/* Title */}
            <div className={`${baseClasses} h-5 w-8 rounded-full ml-3`} /> {/* Badge */}
          </div>
          <div className={`${baseClasses} h-9 w-36 rounded-lg`} /> {/* Add Button */}
        </div>

        {/* Search Bar Placeholder */}
        <div className="mb-7">
            <div className={`${baseClasses} h-10 w-full max-w-md rounded-lg`} />
        </div>

        {/* Table Placeholder */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          <table className="w-full">
            <thead>
              <tr>
                <th className="py-4 pl-6 pr-3 text-left">
                  <div className={`${baseClasses} h-4 w-16 rounded`} /> {/* Nome Header */}
                </th>
                <th className="px-3 py-4 text-left hidden sm:table-cell">
                   <div className={`${baseClasses} h-4 w-20 rounded`} /> {/* Tamanho Header */}
                </th>
                <th className="px-3 py-4 text-left hidden md:table-cell">
                   <div className={`${baseClasses} h-4 w-16 rounded`} /> {/* Data Header */}
                </th>
                <th className="py-4 pl-3 pr-6 text-right">
                   <div className={`${baseClasses} h-4 w-12 rounded`} /> {/* Ações Header */}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => ( // Placeholder for 4 rows
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-4 pl-6 pr-3">
                    <div className="flex items-center gap-2">
                      <div className={`${baseClasses} h-2 w-2 rounded-full flex-shrink-0`} /> {/* Dot */}
                      <div className={`${baseClasses} h-4 w-3/4 rounded`} /> {/* Name */}
                    </div>
                  </td>
                  <td className="px-3 py-4 hidden sm:table-cell">
                    <div className={`${baseClasses} h-4 w-16 rounded`} /> {/* Size */}
                  </td>
                  <td className="px-3 py-4 hidden md:table-cell">
                    <div className={`${baseClasses} h-4 w-20 rounded`} /> {/* Date */}
                  </td>
                  <td className="py-4 pl-3 pr-6 text-right">
                    <div className="flex justify-end gap-4">
                      <div className={`${baseClasses} h-5 w-5 rounded`} /> {/* Edit Icon */}
                      <div className={`${baseClasses} h-5 w-5 rounded`} /> {/* Delete Icon */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  };

  // If a predefined layout is requested, return it
  if (layouts[variant]) {
    return (
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {layouts[variant]}
          </motion.div>
        ) : (
          children
        )}
      </AnimatePresence>
    );
  }

  // For basic variants, return multiple items if count > 1
  return (
    <AnimatePresence>
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {Array.from({ length: count }, (_, i) => renderSkeleton(i))}
        </motion.div>
      ) : (
        children
      )}
    </AnimatePresence>
  );
};

Skeleton.propTypes = {
  variant: PropTypes.oneOf([
    'text',
    'title',
    'avatar',
    'button',
    'card',
    'badge',
    'image',
    'supplierListItem',
    'documentListItem',
    'noteListItem',
    'eventSupplierListItem',
    'eventSupplierList',
    'participantForm',
    'supplierList',
    'documentList'
  ]),
  count: PropTypes.number,
  className: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isLoading: PropTypes.bool,
  children: PropTypes.node
};

export default Skeleton; 