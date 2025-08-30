// Test completo per la generazione del fault tree
const fs = require('fs');

// Simula la risposta LLM
const llmResponse = fs.readFileSync('./test-llm-response.json', 'utf8');

console.log('=== TEST COMPLETO FAULT TREE GENERATION ===\n');

// Simula il parsing LLM
try {
  const parsedResponse = JSON.parse(llmResponse);
  console.log('1. LLM Response parsata correttamente');
  console.log(`   - Elements: ${parsedResponse.elements.length}`);
  console.log(`   - Connections: ${parsedResponse.connections.length}`);
  console.log(`   - Top Event: ${parsedResponse.topEvent}\n`);
  
  // Simula il processo di prettify
  console.log('2. Simulazione prettify...');
  
  const beCount = { value: 0 };
  const gateCounts = {};
  const nameToId = new Map();
  
  // Rinomina elementi
  const newElements = parsedResponse.elements.map(el => {
    if (el.type === 'event') {
      beCount.value += 1;
      const newName = `BE_${beCount.value}`;
      const newDescription = el.name + (el.description ? `: ${el.description}` : '');
      const newId = el.id && el.id.length > 0 ? el.id : newName;
      
      nameToId.set(el.name, newId);
      nameToId.set(newName, newId);
      
      console.log(`   Event: ${el.name} -> ${newName} (ID: ${newId})`);
      
      return {
        ...el,
        id: newId,
        name: newName,
        description: newDescription
      };
    } else {
      const gateType = el.gateType || 'GATE';
      gateCounts[gateType] = (gateCounts[gateType] || 0) + 1;
      const newName = `${gateType}_${gateCounts[gateType]}`;
      const newDescription = el.name + (el.description ? `: ${el.description}` : '');
      const newId = el.id && el.id.length > 0 ? el.id : newName;
      
      nameToId.set(el.name, newId);
      nameToId.set(newName, newId);
      
      console.log(`   Gate: ${el.name} -> ${newName} (ID: ${newId})`);
      
      return {
        ...el,
        id: newId,
        name: newName,
        description: newDescription
      };
    }
  });
  
  console.log('\n3. Mapping name -> ID:');
  nameToId.forEach((id, name) => {
    console.log(`   ${name} -> ${id}`);
  });
  
  // Remap connections
  console.log('\n4. Remap connections:');
  const newConnections = parsedResponse.connections.map(conn => {
    const sourceId = nameToId.get(conn.source) || conn.source;
    const targetId = nameToId.get(conn.target) || conn.target;
    console.log(`   ${conn.source}->${conn.target} -> ${sourceId}->${targetId}`);
    return { source: sourceId, target: targetId };
  }).filter(c => c.source && c.target);
  
  // Infer top event se necessario
  let newTopEvent = parsedResponse.topEvent;
  if (newTopEvent) {
    newTopEvent = nameToId.get(newTopEvent) || newTopEvent;
    console.log(`\n5. Top Event remapped: ${parsedResponse.topEvent} -> ${newTopEvent}`);
  } else {
    console.log('\n5. Inferring Top Event...');
    const gateElements = newElements.filter(e => e.type === 'gate');
    const connectionTargets = new Set(newConnections.map(c => c.target));
    
    console.log('   Gate elements:', gateElements.map(g => ({ name: g.name, id: g.id })));
    console.log('   Connection targets:', Array.from(connectionTargets));
    
    const candidate = gateElements.find(g => g.id && !connectionTargets.has(g.id));
    if (candidate) {
      newTopEvent = candidate.id;
      console.log(`   Top Event inferito: ${candidate.name} -> ${candidate.id}`);
    } else {
      const firstGate = gateElements.find(g => g.id);
      if (firstGate) {
        newTopEvent = firstGate.id;
        console.log(`   Top Event fallback: ${firstGate.name} -> ${firstGate.id}`);
      }
    }
  }
  
  // Simula la creazione del modello finale
  console.log('\n6. Creazione modello finale...');
  
  const events = newElements.filter(el => el.type === 'event').map((el, index) => ({
    id: el.id,
    type: 'basic-event',
    name: el.name,
    description: el.description,
    failureRate: el.failureRate || 0.001,
    position: { x: 100 + (index % 4) * 180, y: 400 },
    parameters: el.parameters || {}
  }));
  
  const gates = newElements.filter(el => el.type === 'gate').map((el, index) => ({
    id: el.id,
    type: 'gate',
    gateType: el.gateType || 'OR',
    name: el.name,
    description: el.description,
    position: { x: 100 + (index % 3) * 250, y: 200 },
    inputs: [],
    parameters: el.parameters || {},
    isTopEvent: el.id === newTopEvent
  }));
  
  const connections = newConnections.map((conn, index) => ({
    id: `connection-${Date.now()}-${index}`,
    source: conn.source,
    target: conn.target,
    type: 'connection'
  }));
  
  console.log(`   Events creati: ${events.length}`);
  console.log(`   Gates create: ${gates.length}`);
  console.log(`   Connections create: ${connections.length}`);
  
  // Verifica Top Event
  const topEventGate = gates.find(g => g.isTopEvent);
  console.log(`\n7. Top Event finale: ${newTopEvent}`);
  console.log(`   Gate con isTopEvent: ${topEventGate ? topEventGate.name : 'NONE'}`);
  console.log(`   Flag isTopEvent impostata: ${topEventGate ? topEventGate.isTopEvent : false}`);
  
  // Verifica connections
  console.log('\n8. Verifica connections:');
  connections.forEach((conn, i) => {
    const sourceExists = events.some(e => e.id === conn.source) || gates.some(g => g.id === conn.source);
    const targetExists = events.some(e => e.id === conn.target) || gates.some(g => g.id === conn.target);
    console.log(`   Connection ${i + 1}: ${conn.source} -> ${conn.target}`);
    console.log(`     Source exists: ${sourceExists}, Target exists: ${targetExists}`);
  });
  
  console.log('\n=== TEST COMPLETATO ===');
  
} catch (error) {
  console.error('Error durante il test:', error);
}
