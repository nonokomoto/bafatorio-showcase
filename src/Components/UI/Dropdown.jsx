import { useState } from 'react';
import PropTypes from 'prop-types';
import {
    useFloating,
    useClick,
    useDismiss,
    useInteractions,
    FloatingPortal,
    offset,
    flip,
    shift,
    autoUpdate // Import autoUpdate
} from '@floating-ui/react';

const Dropdown = ({ trigger, children, menuClassName = '', menuStyle = {}, placement = 'bottom-end' }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Setup floating-ui
    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: placement,
        // Make sure the tooltip stays on the screen
        whileElementsMounted: autoUpdate, // Use autoUpdate
        middleware: [
            offset(5), // Add some space between the trigger and the menu
            flip(),    // Flip to opposite side if not enough space
            shift({ padding: 5 }) // Ensure menu stays within viewport bounds
        ],
    });

    // Setup interactions
    const click = useClick(context);
    const dismiss = useDismiss(context);

    const { getReferenceProps, getFloatingProps } = useInteractions([
        click,
        dismiss,
    ]);

    return (
        <>
            {/* Trigger Element */}
            {/* We pass the ref and interaction props to the trigger's wrapper */}
            <div
                ref={refs.setReference}
                {...getReferenceProps()}
                className="inline-block" // Keep trigger inline
            >
                {trigger}
            </div>

            {/* Dropdown Menu - Rendered in a Portal */}
            <FloatingPortal>
                {isOpen && (
                    <div
                        ref={refs.setFloating}
                        style={{...floatingStyles, ...menuStyle}} // Combine floating styles with custom styles
                        {...getFloatingProps()}
                        className={`z-30 w-48 rounded-md bg-popover shadow-lg ring-1 ring-border/50 focus:outline-none ${menuClassName}`}
                        // We don't need role/aria here as floating-ui handles accessibility implicitly with interactions
                        // Close on item click is handled by the dismiss interaction or can be added explicitly if needed
                        onClick={() => {
                           // Optional: Prevent clicks inside the menu from closing it if not intended
                           // e.stopPropagation();
                           // Close menu explicitly if needed, dismiss interaction usually covers this
                           // setIsOpen(false);
                        }}
                    >
                        {children}
                    </div>
                )}
            </FloatingPortal>
        </>
    );
};

Dropdown.propTypes = {
    trigger: PropTypes.node.isRequired,
    children: PropTypes.node.isRequired,
    menuClassName: PropTypes.string,
    menuStyle: PropTypes.object,
    placement: PropTypes.oneOf([ // Add placement prop type
        'top', 'top-start', 'top-end',
        'right', 'right-start', 'right-end',
        'bottom', 'bottom-start', 'bottom-end',
        'left', 'left-start', 'left-end'
    ]),
};

export default Dropdown; 