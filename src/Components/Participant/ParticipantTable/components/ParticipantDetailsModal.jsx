import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiBriefcase,
    FiCalendar,
    FiClipboard,
    FiUsers,
    FiGlobe,
    FiMapPin,
    FiNavigation,
    FiHome,
    FiDollarSign,
    FiFileText,
    FiTruck,
    FiShield
} from 'react-icons/fi';
import { Modal, Card, Text, Badge, Button } from '../../../UI';
import { getStatusInfo } from '../utils/helpers';
import RoleBadge from '../../RoleBadge';
import SafeEmailLink from '../../../SafeEmailLink';
import { useRoleLookup } from '../../../../Hook/useRoleLookup';

// Componente para cada item de detalhe
const DetailItem = ({
    icon: Icon,
    title,
    value,
    iconColor = 'text-primary-500',
    isEmail = false,
    unavailable = false
}) => (
    <div className="flex items-start gap-3 sm:gap-4 py-3 border-b border-border last:border-0">
        {/* Icon container with fixed size */}
        <div className={`${iconColor} flex-shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-opacity-10 bg-current dark:bg-opacity-20`}>
            <Icon className="h-3.5 w-3.5" />
        </div>
        {/* Text content area - flex-1 allows it to take remaining space and wrap text */}
        <div className="flex-1 min-w-0"> {/* min-w-0 ensures flex item can shrink and wrap */}
            <Text variant="caption" className="text-xs mb-1 text-muted-foreground block truncate" title={title}>
                {title}
            </Text>
            {isEmail && !unavailable ? (
                <SafeEmailLink
                    email={value}
                    className="text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 break-words"
                />
            ) : (
                <Text variant="body2" className={`${unavailable ? "text-muted-foreground" : "text-foreground"} break-words`}> {/* break-words allows text to wrap */}
                    {value}
                </Text>
            )}
        </div>
    </div>
);

DetailItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]).isRequired,
    iconColor: PropTypes.string,
    isEmail: PropTypes.bool,
    unavailable: PropTypes.bool
};

// Componente para cada seção
const DetailSection = ({ title, children }) => (
    <div className="mb-5 last:mb-0">
        <Text variant="subtitle2" className="font-medium text-foreground mb-2 pb-1.5 border-b border-border">
            {title}
        </Text>
        <div className="pl-1 sm:pl-1">
            {children}
        </div>
    </div>
);

DetailSection.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired
};

const ParticipantDetailsModal = ({ isOpen, onClose, participant, dependentCount }) => {
    const { t } = useTranslation('participant');
    const { getRoleName, getRoleColor } = useRoleLookup();

    if (!participant) return null;

    // Mesma precedência do TableRow: o Lambda da lista devolve só roleId
    const roleName = getRoleName(participant.roleId, participant.role?.name);
    const statusInfo = getStatusInfo(participant.participantStatus, t);
    const unavailableText = t('states.unavailable', 'Não disponível');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            animation="scale"
            centered
            showCloseButton={false}
            aria-labelledby="participant-details-modal"
            backdropClassName="!p-4 sm:p-6 !flex !items-center" 
            className="max-h-[90vh] sm:max-h-[85vh] my-4 sm:my-8"
        >
            {/* Card takes full width within modal constraints */}
            <Card className="w-full overflow-hidden max-w-4xl mx-auto flex flex-col max-h-full" elevated="lg">
                <Modal.Header className="border-b border-border pb-3 px-4 sm:px-6 pt-4 sm:pt-5">
                    <div className="flex flex-wrap items-center justify-between w-full gap-x-4 gap-y-2">
                        {/* Participant Name and Role */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                                <FiUser className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="min-w-0">
                                <Text variant="h5" className="font-medium text-foreground mb-0.5 break-words">
                                    {participant.participantName}
                                </Text>
                                <div className="-ml-2">
                                    <RoleBadge roleName={roleName} colorKey={getRoleColor(participant.roleId)} />
                                </div>
                            </div>
                        </div>
                        {/* Status Badge - Placed on the right */}
                        <Badge
                            variant={statusInfo.badgeVariant || "neutral"}
                            size="sm"
                            className={`${statusInfo.color} flex-shrink-0`}
                        >
                            {statusInfo.label}
                        </Badge>
                    </div>
                </Modal.Header>

                <Modal.Body className="px-4 py-5 sm:px-6 overflow-y-auto flex-1 min-h-0">
                    {/* Main content grid: Stacks to 1 column on small screens (<md), 2 columns on medium screens and up */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-6">
                        {/* Coluna 1: Informações de Contato */}
                        <div className="space-y-4 md:space-y-6">
                            <DetailSection title={t('common.contactInfo', 'Informação de Contacto')}>
                                <DetailItem
                                    icon={FiMail}
                                    title={t('participantDetails.fields.email', 'Email')}
                                    value={participant.participantEmail || unavailableText}
                                    isEmail={true}
                                    iconColor="text-blue-500"
                                    unavailable={!participant.participantEmail}
                                />
                                <DetailItem
                                    icon={FiPhone}
                                    title={t('participantDetails.fields.phone', 'Telefone')}
                                    value={participant.participantPhone || unavailableText}
                                    iconColor="text-green-500"
                                    unavailable={!participant.participantPhone}
                                />
                            </DetailSection>
                        </div>

                        {/* Coluna 2: Informações Adicionais */}
                        <div className="space-y-4 md:space-y-6">
                            <DetailSection title={t('common.additionalInfo', 'Informação Adicional')}>
                                <DetailItem
                                    icon={FiBriefcase}
                                    title={t('participantDetails.fields.job', 'Ocupação')}
                                    value={participant.participantJob || unavailableText}
                                    iconColor="text-amber-500"
                                    unavailable={!participant.participantJob}
                                />
                                <DetailItem
                                    icon={FiCalendar}
                                    title={t('common.registrationDate', 'Data de Registo')}
                                    value={participant.registrationDate ? format(new Date(participant.registrationDate), 'dd/MM/yyyy HH:mm') : unavailableText}
                                    iconColor="text-purple-500"
                                    unavailable={!participant.registrationDate}
                                />
                            </DetailSection>
                        </div>
                    </div>

                    {/* Dependents and Notes Section */}
                    <div className="mt-6 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-6">
                            <div>
                                <DetailSection title={t('participantDetails.fields.dependents', 'Acompanhantes')}>
                                    <DetailItem
                                        icon={FiUsers}
                                        title={t('participantDetails.fields.dependents', 'Acompanhantes')}
                                        value={dependentCount ?? '0'}
                                        iconColor="text-indigo-500"
                                    />
                                </DetailSection>
                            </div>
                            <div>
                                <DetailSection title={t('participantDetails.fields.note', 'Notas')}>
                                    <DetailItem
                                        icon={FiClipboard}
                                        value={participant.participantNote || unavailableText}
                                        iconColor="text-muted-foreground"
                                        unavailable={!participant.participantNote}
                                        title={t('participantDetails.fields.note', 'Notas')}
                                    />
                                </DetailSection>
                            </div>
                        </div>
                    </div>

                    {/* Logistics Sections */}
                    {(participant.documentationType || participant.nationality || participant.organization || participant.emergencyContact) && (
                        <div className="mt-6 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.identification', 'Identificacao')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    {participant.documentationType && <DetailItem icon={FiShield} title={t('pages.participantForm.fields.documentationType.title')} value={participant.documentationType} iconColor="text-muted-foreground" />}
                                    {participant.documentLast4 && <DetailItem icon={FiShield} title={t('pages.participantForm.fields.documentLast4.title')} value={participant.documentLast4} iconColor="text-muted-foreground" />}
                                    {participant.nationality && <DetailItem icon={FiGlobe} title={t('pages.participantForm.fields.nationality.title')} value={participant.nationality} iconColor="text-blue-500" />}
                                    {participant.residenceCountry && <DetailItem icon={FiGlobe} title={t('pages.participantForm.fields.residenceCountry.title')} value={participant.residenceCountry} iconColor="text-blue-500" />}
                                    {participant.organization && <DetailItem icon={FiBriefcase} title={t('pages.participantForm.fields.organization.title')} value={participant.organization} iconColor="text-amber-500" />}
                                    {participant.emergencyContact && <DetailItem icon={FiPhone} title={t('pages.participantForm.fields.emergencyContact.title')} value={participant.emergencyContact} iconColor="text-red-500" />}
                                    {participant.internalId && <DetailItem icon={FiFileText} title={t('pages.participantForm.fields.internalId.title')} value={participant.internalId} iconColor="text-muted-foreground" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.visaRequired != null || participant.visaSupport != null) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.visa', 'Visto')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    <DetailItem icon={FiGlobe} title={t('pages.participantForm.fields.visaRequired.title')} value={participant.visaRequired ? t('pages.participantForm.dependents.options.yes', 'Sim') : t('pages.participantForm.dependents.options.no', 'Nao')} iconColor="text-orange-500" />
                                    <DetailItem icon={FiGlobe} title={t('pages.participantForm.fields.visaSupport.title')} value={participant.visaSupport ? t('pages.participantForm.dependents.options.yes', 'Sim') : t('pages.participantForm.dependents.options.no', 'Nao')} iconColor="text-orange-500" />
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.arrivalDate || participant.arrivalFlight) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.arrival', 'Chegada')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    {participant.arrivalDate && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.arrivalDate.title')} value={participant.arrivalDate} iconColor="text-green-500" />}
                                    {participant.arrivalTime && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.arrivalTime.title')} value={participant.arrivalTime} iconColor="text-green-500" />}
                                    {participant.arrivalFlight && <DetailItem icon={FiNavigation} title={t('pages.participantForm.fields.arrivalFlight.title')} value={participant.arrivalFlight} iconColor="text-blue-500" />}
                                    {participant.arrivalAirport && <DetailItem icon={FiMapPin} title={t('pages.participantForm.fields.arrivalAirport.title')} value={participant.arrivalAirport} iconColor="text-blue-500" />}
                                    {participant.arrivalLayovers && <DetailItem icon={FiMapPin} title={t('pages.participantForm.fields.arrivalLayovers.title')} value={participant.arrivalLayovers} iconColor="text-muted-foreground" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.transferRequired != null || participant.transferDetails) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.transfer', 'Transfer')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    <DetailItem icon={FiTruck} title={t('pages.participantForm.fields.transferRequired.title')} value={participant.transferRequired ? t('pages.participantForm.dependents.options.yes', 'Sim') : t('pages.participantForm.dependents.options.no', 'Nao')} iconColor="text-indigo-500" />
                                    {participant.transferDetails && <DetailItem icon={FiTruck} title={t('pages.participantForm.fields.transferDetails.title')} value={participant.transferDetails} iconColor="text-indigo-500" />}
                                    {participant.transferCost != null && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.transferCost.title')} value={`${participant.transferCost} ${participant.transferCurrency || ''}`} iconColor="text-green-500" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.hotel || participant.checkInDate) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.accommodation', 'Alojamento')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    {participant.hotel && <DetailItem icon={FiHome} title={t('pages.participantForm.fields.hotel.title')} value={participant.hotel} iconColor="text-purple-500" />}
                                    {participant.roomType && <DetailItem icon={FiHome} title={t('pages.participantForm.fields.roomType.title')} value={participant.roomType} iconColor="text-purple-500" />}
                                    {participant.checkInDate && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.checkInDate.title')} value={participant.checkInDate} iconColor="text-green-500" />}
                                    {participant.checkOutDate && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.checkOutDate.title')} value={participant.checkOutDate} iconColor="text-red-500" />}
                                    {participant.nights != null && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.nights.title')} value={String(participant.nights)} iconColor="text-muted-foreground" />}
                                    {participant.ratePerNight != null && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.ratePerNight.title')} value={`${participant.ratePerNight} ${participant.rateCurrency || ''}`} iconColor="text-green-500" />}
                                    {participant.accommodationCost != null && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.accommodationCost.title')} value={`${participant.accommodationCost} ${participant.rateCurrency || ''}`} iconColor="text-green-500" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.departureDate || participant.departureFlight) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.departure', 'Partida')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    {participant.departureDate && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.departureDate.title')} value={participant.departureDate} iconColor="text-orange-500" />}
                                    {participant.departureTime && <DetailItem icon={FiCalendar} title={t('pages.participantForm.fields.departureTime.title')} value={participant.departureTime} iconColor="text-orange-500" />}
                                    {participant.departureFlight && <DetailItem icon={FiNavigation} title={t('pages.participantForm.fields.departureFlight.title')} value={participant.departureFlight} iconColor="text-blue-500" />}
                                    {participant.departureAirport && <DetailItem icon={FiMapPin} title={t('pages.participantForm.fields.departureAirport.title')} value={participant.departureAirport} iconColor="text-blue-500" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.ticketFare != null || participant.paymentStatus || participant.bookingReference) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.financial', 'Financeiro')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    {participant.ticketFare != null && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.ticketFare.title')} value={`${participant.ticketFare} ${participant.ticketCurrency || ''}`} iconColor="text-green-500" />}
                                    {participant.taxesExtras != null && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.taxesExtras.title')} value={`${participant.taxesExtras} ${participant.taxesCurrency || ''}`} iconColor="text-green-500" />}
                                    {participant.totalTravelCost != null && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.totalTravelCost.title')} value={`${participant.totalTravelCost} ${participant.totalTravelCurrency || ''}`} iconColor="text-green-600" />}
                                    {participant.paymentStatus && <DetailItem icon={FiDollarSign} title={t('pages.participantForm.fields.paymentStatus.title')} value={t(`pages.participantForm.paymentStatuses.labels.${participant.paymentStatus}`, participant.paymentStatus)} iconColor="text-amber-500" />}
                                    {participant.bookingReference && <DetailItem icon={FiFileText} title={t('pages.participantForm.fields.bookingReference.title')} value={participant.bookingReference} iconColor="text-muted-foreground" />}
                                    {participant.bookingAgency && <DetailItem icon={FiFileText} title={t('pages.participantForm.fields.bookingAgency.title')} value={participant.bookingAgency} iconColor="text-muted-foreground" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}

                    {(participant.dietaryRestriction || participant.protocol) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <DetailSection title={t('pages.participantForm.sections.other', 'Outros')}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    {participant.dietaryRestriction && <DetailItem icon={FiClipboard} title={t('pages.participantForm.fields.dietaryRestriction.title')} value={participant.dietaryRestriction} iconColor="text-pink-500" />}
                                    {participant.protocol && <DetailItem icon={FiClipboard} title={t('pages.participantForm.fields.protocol.title')} value={participant.protocol} iconColor="text-muted-foreground" />}
                                </div>
                            </DetailSection>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="border-t border-border pt-3 pb-3 px-4 sm:px-6 flex-shrink-0">
                    <div className="flex justify-end w-full">
                        <Button variant="ghost" size="md" onClick={onClose}>
                            {t('common.close', 'Fechar')}
                        </Button>
                    </div>
                </Modal.Footer>
            </Card>
        </Modal>
    );
};

ParticipantDetailsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    participant: PropTypes.shape({
        id: PropTypes.string,
        participantName: PropTypes.string,
        participantEmail: PropTypes.string,
        participantPhone: PropTypes.string,
        participantJob: PropTypes.string,
        roleId: PropTypes.string,
        role: PropTypes.shape({
            id: PropTypes.string,
            name: PropTypes.string,
        }),
        participantStatus: PropTypes.string,
        participantNote: PropTypes.string,
        registrationDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        documentationType: PropTypes.string,
        documentLast4: PropTypes.string,
        nationality: PropTypes.string,
        residenceCountry: PropTypes.string,
        organization: PropTypes.string,
        emergencyContact: PropTypes.string,
        internalId: PropTypes.string,
        visaRequired: PropTypes.bool,
        visaSupport: PropTypes.bool,
        arrivalDate: PropTypes.string,
        arrivalTime: PropTypes.string,
        arrivalFlight: PropTypes.string,
        arrivalAirport: PropTypes.string,
        arrivalLayovers: PropTypes.string,
        transferRequired: PropTypes.bool,
        transferDetails: PropTypes.string,
        transferCost: PropTypes.number,
        transferCurrency: PropTypes.string,
        hotel: PropTypes.string,
        roomType: PropTypes.string,
        checkInDate: PropTypes.string,
        checkOutDate: PropTypes.string,
        nights: PropTypes.number,
        ratePerNight: PropTypes.number,
        rateCurrency: PropTypes.string,
        accommodationCost: PropTypes.number,
        departureDate: PropTypes.string,
        departureTime: PropTypes.string,
        departureFlight: PropTypes.string,
        departureAirport: PropTypes.string,
        ticketFare: PropTypes.number,
        ticketCurrency: PropTypes.string,
        taxesExtras: PropTypes.number,
        taxesCurrency: PropTypes.string,
        totalTravelCost: PropTypes.number,
        totalTravelCurrency: PropTypes.string,
        paymentStatus: PropTypes.string,
        bookingReference: PropTypes.string,
        bookingAgency: PropTypes.string,
        dietaryRestriction: PropTypes.string,
        protocol: PropTypes.string,
    }),
    dependentCount: PropTypes.number
};




export default ParticipantDetailsModal;
