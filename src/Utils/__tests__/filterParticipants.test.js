import { filterParticipants } from '../filterParticipants';

const P = [
  { id: '1', participantName: 'Bruno Costa', participantEmail: 'bruno@dev.pt', organization: 'DevHouse' },
  { id: '2', participantName: 'ana martins', participantEmail: 'ana@nova.pt', organization: 'Nova Tech' },
  { id: '3', participantName: 'Carlos Nunes', participantEmail: 'carlos@y.pt', organization: 'Nova Tech' },
];

describe('filterParticipants', () => {
  it('sem query devolve todos ordenados por nome (case-insensitive)', () => {
    const r = filterParticipants(P, '');
    expect(r.map((p) => p.id)).toEqual(['2', '1', '3']); // ana, Bruno, Carlos
  });

  it('filtra por nome (case-insensitive)', () => {
    expect(filterParticipants(P, 'BRUNO').map((p) => p.id)).toEqual(['1']);
  });

  it('filtra por email', () => {
    expect(filterParticipants(P, 'ana@nova').map((p) => p.id)).toEqual(['2']);
  });

  it('filtra por organização e mantém ordenação por nome', () => {
    expect(filterParticipants(P, 'nova tech').map((p) => p.id)).toEqual(['2', '3']);
  });

  it('query com espaços nas pontas é normalizada', () => {
    expect(filterParticipants(P, '  bruno  ').map((p) => p.id)).toEqual(['1']);
  });

  it('sem correspondência devolve lista vazia', () => {
    expect(filterParticipants(P, 'xyz')).toEqual([]);
  });

  it('tolera campos em falta sem rebentar', () => {
    const messy = [{ id: '9', participantName: null, participantEmail: null, organization: null }];
    expect(filterParticipants(messy, 'algo')).toEqual([]);
    expect(filterParticipants(messy, '').map((p) => p.id)).toEqual(['9']);
  });

  it('entrada não-array devolve lista vazia', () => {
    expect(filterParticipants(undefined, '')).toEqual([]);
    expect(filterParticipants(null, 'x')).toEqual([]);
  });
});
