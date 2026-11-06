import { useState } from 'react';
import { 
  useListEventsEnhancedQuery, 
  useGetSingleEventEnhancedQuery 
} from '../Api/services/eventApi';
import { 
  useListParticipantsByEventEnhancedQuery,
  useGetParticipantEnhancedQuery 
} from '../Api/services/participantApi';
import {
  useListDependentsByParticipantEnhancedQuery,
  useListDependentsByEventEnhancedQuery
} from '../Api/services/dependentsApi';

/**
 * Componente de teste completo para queries enhanced com Data Client
 * Acesso direto: http://localhost:5173/test-enhanced
 */
export default function TestEnhancedQueries() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);

  // Test 1: List all events with participants
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError 
  } = useListEventsEnhancedQuery();

  // Test 2: Get single event (only if selected)
  const { 
    data: singleEvent, 
    isLoading: singleLoading 
  } = useGetSingleEventEnhancedQuery(
    { id: selectedEventId },
    { skip: !selectedEventId }
  );

  // Test 3: List participants for selected event
  const {
    data: participantsData,
    isLoading: participantsLoading
  } = useListParticipantsByEventEnhancedQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  // Test 4: Get single participant with dependents
  const {
    data: singleParticipant,
    isLoading: participantLoading
  } = useGetParticipantEnhancedQuery(
    { id: selectedParticipantId },
    { skip: !selectedParticipantId }
  );

  // Test 5: List dependents by participant
  const {
    data: dependentsByParticipant,
    isLoading: depsParticipantLoading
  } = useListDependentsByParticipantEnhancedQuery(
    { participantId: selectedParticipantId },
    { skip: !selectedParticipantId }
  );

  // Test 6: List ALL dependents by event (NESTED!)
  const {
    data: dependentsByEvent,
    isLoading: depsEventLoading
  } = useListDependentsByEventEnhancedQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🧪 Test ALL Enhanced Queries (Data Client)</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        ✅ TODAS as flags ativas! Abre DevTools Console (F12) para ver logs com métricas
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Test 1: List Events */}
        <div style={{ 
          border: '2px solid #4CAF50', 
          borderRadius: '8px', 
          padding: '15px',
          backgroundColor: '#f0f9f0'
        }}>
          <h2>📋 Test 1: listEventsEnhanced</h2>
          <p style={{ fontSize: '12px' }}>Event.list() + participants.*</p>
          
          {eventsLoading && <div>⏳ Loading...</div>}
          {eventsError && <div style={{ color: 'red' }}>❌ {eventsError.message}</div>}
          
          {eventsData && (
            <div>
              <div style={{ backgroundColor: '#e8f5e9', padding: '8px', borderRadius: '4px', marginBottom: '10px', fontSize: '13px' }}>
                ✅ {eventsData.items?.length || 0} events | {eventsData.items?.reduce((sum, e) => sum + (e.participants?.length || 0), 0)} participants
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {eventsData.items?.slice(0, 5).map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    style={{ 
                      border: '1px solid #ddd',
                      padding: '8px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedEventId === event.id ? '#bbdefb' : 'white',
                      fontSize: '12px'
                    }}
                  >
                    <strong>{event.eventTitle || 'Untitled'}</strong>
                    <div style={{ color: '#2196F3' }}>
                      👥 {event.participants?.length || 0} participants
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Test 2: Single Event */}
        <div style={{ 
          border: '2px solid #2196F3', 
          borderRadius: '8px', 
          padding: '15px',
          backgroundColor: '#e3f2fd'
        }}>
          <h2>🔍 Test 2: getSingleEventEnhanced</h2>
          <p style={{ fontSize: '12px' }}>Event.get(id) + participants.*</p>
          
          {!selectedEventId && <div style={{ fontSize: '12px' }}>← Seleciona um evento</div>}
          {singleLoading && <div>⏳ Loading...</div>}
          
          {singleEvent && (
            <div style={{ fontSize: '12px' }}>
              <div style={{ backgroundColor: '#bbdefb', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                ✅ {singleEvent.eventTitle}<br/>
                👥 {singleEvent.participants?.length || 0} participants<br/>
                📍 {singleEvent.eventLocation || 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Test 3: List Participants */}
        <div style={{ 
          border: '2px solid #FF9800', 
          borderRadius: '8px', 
          padding: '15px',
          backgroundColor: '#fff3e0'
        }}>
          <h2>👥 Test 3: listParticipantsByEventEnhanced</h2>
          <p style={{ fontSize: '12px' }}>Event.get() extrai participants</p>
          
          {!selectedEventId && <div style={{ fontSize: '12px' }}>← Seleciona um evento</div>}
          {participantsLoading && <div>⏳ Loading...</div>}
          
          {participantsData && (
            <div>
              <div style={{ backgroundColor: '#ffe0b2', padding: '8px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px' }}>
                ✅ {participantsData.items?.length || 0} participants loaded
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {participantsData.items?.slice(0, 10).map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedParticipantId(p.id)}
                    style={{
                      padding: '6px',
                      backgroundColor: selectedParticipantId === p.id ? '#ffcc80' : 'white',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      border: '1px solid #ddd'
                    }}
                  >
                    <strong>{p.participantName}</strong>
                    {p.dependentsCount > 0 && (
                      <span style={{ color: '#FF5722', marginLeft: '8px' }}>
                        👨‍👩‍👧 {p.dependentsCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Test 4: Single Participant */}
        <div style={{ 
          border: '2px solid #9C27B0', 
          borderRadius: '8px', 
          padding: '15px',
          backgroundColor: '#f3e5f5'
        }}>
          <h2>🔍 Test 4: getParticipantEnhanced</h2>
          <p style={{ fontSize: '12px' }}>Participant.get() + dependents.*</p>
          
          {!selectedParticipantId && <div style={{ fontSize: '12px' }}>← Seleciona um participant</div>}
          {participantLoading && <div>⏳ Loading...</div>}
          
          {singleParticipant && (
            <div style={{ fontSize: '12px' }}>
              <div style={{ backgroundColor: '#e1bee7', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                ✅ {singleParticipant.participantName}<br/>
                📧 {singleParticipant.participantEmail}<br/>
                👨‍👩‍👧 {singleParticipant.dependents?.length || 0} dependents
              </div>
              
              {singleParticipant.dependents?.length > 0 && (
                <div>
                  {singleParticipant.dependents.map(d => (
                    <div key={d.id} style={{ padding: '4px', backgroundColor: 'white', borderRadius: '2px', marginBottom: '2px', fontSize: '10px' }}>
                      {d.name} ({d.age || 'N/A'})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test 5: Dependents by Participant */}
        <div style={{ 
          border: '2px solid #00BCD4', 
          borderRadius: '8px', 
          padding: '15px',
          backgroundColor: '#e0f7fa'
        }}>
          <h2>👨‍👩‍👧 Test 5: listDependentsByParticipantEnhanced</h2>
          <p style={{ fontSize: '12px' }}>Participant.get() extrai dependents</p>
          
          {!selectedParticipantId && <div style={{ fontSize: '12px' }}>← Seleciona um participant</div>}
          {depsParticipantLoading && <div>⏳ Loading...</div>}
          
          {dependentsByParticipant && (
            <div style={{ fontSize: '12px' }}>
              <div style={{ backgroundColor: '#b2ebf2', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                ✅ {dependentsByParticipant.items?.length || 0} dependents
              </div>
              
              {dependentsByParticipant.items?.map(d => (
                <div key={d.id} style={{ padding: '4px', backgroundColor: 'white', borderRadius: '2px', marginBottom: '2px', fontSize: '12px' }}>
                  {d.name} - Age: {d.age || 'N/A'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test 6: NESTED Query! */}
        <div style={{ 
          border: '3px solid #F44336', 
          borderRadius: '8px', 
          padding: '15px',
          backgroundColor: '#ffebee'
        }}>
          <h2>🎯 Test 6: listDependentsByEventEnhanced</h2>
          <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#D32F2F' }}>
            🚀 NESTED! Event → Participants → Dependents (1 query!)
          </p>
          
          {!selectedEventId && <div style={{ fontSize: '12px' }}>← Seleciona um evento</div>}
          {depsEventLoading && <div>⏳ Loading nested data...</div>}
          
          {dependentsByEvent && (
            <div style={{ fontSize: '12px' }}>
              <div style={{ backgroundColor: '#ffcdd2', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                ✅ {dependentsByEvent.items?.length || 0} total dependents<br/>
                <strong style={{ color: '#D32F2F' }}>ANTES: 3+ queries | AGORA: 1 query!</strong>
              </div>
              
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {dependentsByEvent.items?.slice(0, 10).map(d => (
                  <div key={d.id} style={{ padding: '4px', backgroundColor: 'white', borderRadius: '2px', marginBottom: '2px', fontSize: '12px' }}>
                    {d.name} ({d.age || 'N/A'})
                  </div>
                ))}
                {dependentsByEvent.items?.length > 10 && (
                  <div style={{ padding: '4px', color: '#666', fontSize: '10px' }}>
                    +{dependentsByEvent.items.length - 10} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '2px solid #ffc107'
      }}>
        <h3>📊 Resumo dos Testes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px' }}>
            <strong>✅ EventApi</strong><br/>
            • listEventsEnhanced<br/>
            • getSingleEventEnhanced
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px' }}>
            <strong>✅ ParticipantApi</strong><br/>
            • listByEventEnhanced<br/>
            • getParticipantEnhanced
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px' }}>
            <strong>✅ DependentsApi</strong><br/>
            • listByParticipantEnhanced<br/>
            • listByEventEnhanced (NESTED!)
          </div>
        </div>
        
        <p style={{ marginTop: '15px', color: '#856404' }}>
          <strong>💡 Vê na consola:</strong> Cada query mostra tempo de execução e quantidade de dados carregados!
        </p>
      </div>
    </div>
  );
}
