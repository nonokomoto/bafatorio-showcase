import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const defaultVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const AnimatedContent = ({ 
  children, 
  variants = defaultVariants, 
  transition = { duration: 0.2, ease: "easeInOut" },
  className = '' 
}) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
};

AnimatedContent.propTypes = {
  children: PropTypes.node.isRequired,
  variants: PropTypes.object,
  transition: PropTypes.object,
  className: PropTypes.string,
};

export default AnimatedContent; 