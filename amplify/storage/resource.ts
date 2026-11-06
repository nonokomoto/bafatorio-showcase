import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
    name: "userStorage",
    access: (allow) => ({
        
        // Nas regras allow.groups() o {entity_id} é substituído por '*', pelo que
        // uma regra de grupo aqui daria a QUALQUER membro (o post-confirmation
        // inscreve toda a gente em USER) escrita e apagamento sobre os ficheiros
        // de todos os outros. O acesso do dono vem do allow.entity('identity'),
        // que a AWS resolve para o identityId da sessão — sem grupos.
        'profile-pictures/{entity_id}/*': [
            allow.authenticated.to(['read']),
            allow.entity('identity').to(['read', 'write', 'delete'])
        ],
        // Legacy per-user documents path (kept for backward compatibility).
        // New uploads use event-documents/* instead.
        'documents/{entity_id}/*': [
            allow.entity('identity').to(['write', 'delete', 'read'])
        ],
        // Shared event documents — no {entity_id} so all collaborators see the same files.
        // Path structure: event-documents/{eventId}/{folderId}/{fileName}
        // Per-event access control is enforced at application level (list-event-folders Lambda + frontend role checks).
        'event-documents/*': [
            allow.authenticated.to(['read']),
            allow.groups(['USER', 'ADMIN']).to(['read', 'write', 'delete'])
        ]
    }),
});