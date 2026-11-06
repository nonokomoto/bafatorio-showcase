import { Menu, Transition, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { FiColumns } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const ColumnVisibilityMenu = ({ columns, visibleColumns, onToggleColumn }) => {
  const { t } = useTranslation('participant');
  
  return (
    <Menu as="div" className="relative inline-block text-left">
      {() => (
        <>
          <div>
            <MenuButton className="flex items-center justify-center px-4 py-2 text-sm font-medium text-primary bg-card border border-primary rounded-md shadow-sm hover:bg-primary-dark hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 ease-in-out">
              <FiColumns className="mr-2" />
              {t('pages.participantTable.columnVisibility.columns')}
            </MenuButton>
          </div>

          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <MenuItems className="absolute right-0 mt-2 w-56 origin-top-right bg-popover divide-y divide-border rounded-md shadow-lg ring-1 ring-border focus:outline-none z-10">
              <div className="px-1 py-1">
                {columns.map((column) => (
                  <MenuItem key={column.accessor}>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-primary text-primary-foreground' : 'text-popover-foreground'
                        } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                        onClick={() => onToggleColumn(column.accessor)}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(column.accessor)}
                          onChange={() => onToggleColumn(column.accessor)}
                          className="mr-2"
                        />
                        {column.Header}
                      </button>
                    )}
                  </MenuItem>
                ))}
              </div>
            </MenuItems>
          </Transition>
        </>
      )}
    </Menu>
  );
};

ColumnVisibilityMenu.propTypes = {
  columns: PropTypes.array.isRequired,
  visibleColumns: PropTypes.array.isRequired,
  onToggleColumn: PropTypes.func.isRequired
};

export default ColumnVisibilityMenu; 