// src/Components/Pages/Suppliers.jsx
import { useTranslation } from 'react-i18next';
import HeaderWithButton from '../HeaderWithButton';
import { useNavigate } from 'react-router-dom';
import SupplierList from '../Supplier/SupplierList';

const Suppliers = () => {
  const { t: supplierT } = useTranslation('supplier');
  const navigate = useNavigate();

  const handleAddSupplier = () => {
    navigate('/app/suppliers/register');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <HeaderWithButton
        title={supplierT('pages.suppliers.title', 'Suppliers')}
        paragraph={supplierT('pages.suppliers.description', 'Manage your list of suppliers.')}
        buttonText={supplierT('list.addSupplierButton', 'Add Supplier')}
        onButtonClick={handleAddSupplier}
        type="create"
      />

      <SupplierList />
    </div>
  );
};

export default Suppliers; 